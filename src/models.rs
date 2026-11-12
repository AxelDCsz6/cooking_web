use serde;

#[derive(Debug, Clone, Serialize)]
pub struct recipe {
    id: u32,
    title: String,
    description: String,
    image: Option<String>,
}
