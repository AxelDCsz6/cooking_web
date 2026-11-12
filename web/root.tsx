import { createRoot } from "react-dom/client";
import './styles.css';
import { useState, useEffect } from "react";
import { Form } from "./form";
import MarkdownComponent from "./recipeView";

type Recipe = {
  title: string;
  description: string;
  path?: string | null;
};

// Minúsculas y sin acentos, para que "manzana" encuentre "Manzana" o "pay de manzana".
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function App() {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (showForm || selected) return;

    let cancelled = false;

    fetch("/recipe_names")
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json() as Promise<Recipe[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setRecipes(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [showForm, selected]);

  if (showForm) {
    return <Form onCreated={() => setShowForm(false)} />;
  }

  if (selected) {
    return <RecipeView recipe={selected} onBack={() => setSelected(null)} />;
  }

  const trimmedQuery = normalize(query.trim());
  const filteredRecipes = trimmedQuery
    ? recipes.filter(
        (recipe) =>
          normalize(recipe.title).includes(trimmedQuery) ||
          normalize(recipe.description).includes(trimmedQuery),
      )
    : recipes;

  return (
    <div id="general">
      <div id="header">
        <div id="hero">
          <div id="title">
            <h1>Recetas</h1>
            <input
              id="search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título o descripción…"
              aria-label="Buscar recetas por título o descripción"
            />
          </div>
          <button id="form_link" onClick={() => setShowForm(true)}>+</button>
        </div>
      </div>
      <div id="content">
        {error && (
          <p className="contentMessage" style={{ color: "#b00020" }}>
            No se pudieron cargar las recetas: {error}
          </p>
        )}
        {!error && recipes.length > 0 && filteredRecipes.length === 0 && (
          <p className="contentMessage">No hay recetas que coincidan con “{query.trim()}”.</p>
        )}
        {filteredRecipes.map((recipe) => (
          <RecipeTag
            key={`${recipe.title}-${recipe.path ?? ""}`}
            recipe={recipe}
            onOpen={() => setSelected(recipe)}
          />
        ))}
      </div>
    </div>
  );
}

function RecipeTag({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  return (
    <div className="recipeTag" role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
    >
      <h2>{recipe.title}</h2>
      <p className="description">{recipe.description}</p>
      <span className="recipeTag__hint">Leer receta</span>
    </div>
  );
}

function RecipeView({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  return (
    <div id="general">
      <div id="header">
        <div id="hero">
          <button id="back_link" onClick={onBack}>← Volver</button>
          <div id="title">
            <h1>{recipe.title}</h1>
          </div>
        </div>
      </div>

      <div className="markdown">
        {recipe.path ? (
          <MarkdownComponent path={recipe.path} />
        ) : (
          <p>{recipe.description}</p>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
