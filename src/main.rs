use anyhow::Result;
use axum::http::{uri::Uri, Request, Response};
use axum::{
    extract::State,
    routing::{get, post},
    Router,
};
use hyper::{client::HttpConnector, Body};
use hyper_tls::HttpsConnector;
use lazy_static::lazy_static;
use std::collections::HashSet;
use std::net::SocketAddr;

type Client = hyper::client::Client<HttpsConnector<HttpConnector>, Body>;

lazy_static! {
    static ref BANNED_SET: HashSet<String> = {
        let mut set: HashSet<String> = HashSet::new();
        set.insert("dependabot[bot]".to_string());
        set
    };
}

fn find_pr_author(value: &serde_json::Value) -> Option<String> {
    value
        .as_object()?
        .get("pull_request")?
        .as_object()?
        .get("user")?
        .as_object()?
        .get("login")?
        .as_str()
        .map(|v| v.to_string())
}

fn find_head_commit_author(value: &serde_json::Value) -> Option<String> {
    value
        .as_object()?
        .get("head_commit")?
        .as_object()?
        .get("author")?
        .as_object()?
        .get("name")?
        .as_str()
        .map(|v| v.to_string())
}

async fn webhook_handler(State(client): State<Client>, mut req: Request<Body>) -> Response<Body> {
    let path_query = req
        .uri()
        .path_and_query()
        .map(|v| v.as_str())
        .unwrap_or_else(|| req.uri().path());

    let uri = format!("https://discord.com{path_query}");

    req.headers_mut().remove("host");
    *req.uri_mut() = Uri::try_from(uri).unwrap();

    let bytes = hyper::body::to_bytes(req.body_mut()).await.unwrap();
    let parsed: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    if find_pr_author(&parsed)
        .filter(|v| BANNED_SET.contains(v))
        .is_some()
    {
        return Response::builder().body(Body::empty()).unwrap();
    }

    if find_head_commit_author(&parsed)
        .filter(|v| BANNED_SET.contains(v))
        .is_some()
    {
        return Response::builder().body(Body::empty()).unwrap();
    }

    *req.body_mut() = Body::from(bytes);

    client.request(req).await.unwrap()
}

async fn health() -> &'static str {
    "Success"
}

#[tokio::main]
async fn main() -> Result<()> {
    let https = HttpsConnector::new();
    let client = hyper::Client::builder().build::<_, hyper::Body>(https);

    let port_env: u16 = std::env::var("PORT")
        .map(|v| v.parse().unwrap())
        .unwrap_or(8080);

    let addr = SocketAddr::from(([0, 0, 0, 0], port_env));

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/webhooks/*etc", post(webhook_handler))
        .with_state(client);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();

    Ok(())
}
