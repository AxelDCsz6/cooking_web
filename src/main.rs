use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Multipart},
    http::StatusCode,
    routing::{get, post},
};

use tower_http::services::ServeDir;
use mongodb::{Client, bson::{doc, Document}};
use std::path::Path;

#[tokio::main]
async fn main() {
    let socket = "0.0.0.0:3000";
    let app = create_router();

    std::fs::create_dir_all("static/recipes").expect("No se pudo crear static/recipes");

    println!("Running on {}", socket);
    let listener = tokio::net::TcpListener::bind(socket).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn create_router() -> Router {
    let root_dir = ServeDir::new("./dist/");

    Router::new()
        .route("/recipe_names", get(read_recipes))
        .route("/create_recipe", post(create_recipe))
        .nest_service("/static", ServeDir::new("./static"))
        .layer(DefaultBodyLimit::max(20 * 1024 * 1024))
        .fallback_service(root_dir)
}

async fn create_recipe(mut multipart: Multipart) -> (StatusCode, String) {
    let mut title = String::new();
    let mut description = String::new();
    let mut uploaded: Option<(String, axum::body::Bytes)> = None;

    while let Some(field) = match multipart.next_field().await {
        Ok(field) => field,
        Err(error) => return (StatusCode::BAD_REQUEST, error.to_string()),
    } {
        match field.name() {
            Some("title") => title = field.text().await.unwrap_or_default(),
            Some("description") => description = field.text().await.unwrap_or_default(),
            Some("file") => {
                let original = field.file_name().unwrap_or("archivo").to_string();
                let safe_name = Path::new(&original)
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();

                let data = match field.bytes().await {
                    Ok(data) => data,
                    Err(error) => return (StatusCode::BAD_REQUEST, error.to_string()),
                };

                uploaded = Some((safe_name, data));
            }
            _ => {}
        }
    }

    if title.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, "El titulo es obligatorio".to_string());
    }
    if description.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, "La descripcion es obligatoria".to_string());
    }

    let mut path: Option<String> = None;

    if let Some((file_name, data)) = uploaded {
        let destination = Path::new("static/recipes").join(&file_name);

        if destination.exists() {
            return (
                StatusCode::CONFLICT,
                format!("El archivo '{file_name}' ya existe"),
            );
        }

        if let Err(error) = std::fs::write(&destination, &data) {
            return (StatusCode::INTERNAL_SERVER_ERROR, error.to_string());
        }

        path = Some(format!("/static/recipes/{file_name}"));
    }

    let client = Client::with_uri_str("mongodb://127.0.0.1:27017")
        .await
        .expect("Error en la conexion con la db");
    let collection = client.database("recipes").collection::<Document>("recipe");

    match collection
        .insert_one(doc! {
            "title": title,
            "description": description,
            "path": path,
        })
        .await
    {
        Ok(_) => (StatusCode::CREATED, "Receta creada con exito".to_string()),
        Err(error) => (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()),
    }
}

async fn read_recipes() -> Result<Json<Vec<Document>>, (StatusCode, String)>{
    let client = Client::with_uri_str("mongodb://127.0.0.1:27017").await.expect("Error en la conexion con la db");
    let database = client.database("recipes");
    let collection  = database.collection::<Document>("recipe");

    let mut recipes: Vec<Document> = Vec::new();

    let mut cursor = collection
        .find(doc! {})
        .projection(doc! { "title": 1, "description": 1, "path": 1 })
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    loop {
        match cursor.advance().await {
            Ok(true) => {}
            Ok(false) => break,
            Err(error) => return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
        }

        match cursor.deserialize_current() {
            Ok(recipe) => recipes.push(recipe),
            Err(error) => return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
        }
    }
    Ok(Json(recipes))
}

