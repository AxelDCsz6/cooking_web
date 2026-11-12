import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

export default function MarkdownComponent({ path }: { path: string }) {
  const isImage = IMAGE_EXTENSIONS.test(path);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isImage) return;

    let cancelled = false;

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [path, isImage]);

  if (isImage) {
    return <img src={path} alt="" />;
  }

  if (error) {
    return <p style={{ color: "#b00020" }}>No se pudo cargar la receta: {error}</p>;
  }

  if (content === null) {
    return <p>Cargando receta...</p>;
  }

  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
}
