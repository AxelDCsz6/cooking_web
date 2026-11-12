import { useState, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";

export function Form({ onCreated }: { onCreated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
    // Una vez cargado el archivo, la zona queda bloqueada
    disabled: file !== null,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;

    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("description") as HTMLInputElement).value.trim();

    if (!title || !description) {
      setError("El nombre y la descripción son obligatorios.");
      return;
    }

    // Multipart: el backend guarda el archivo en static/recipes
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (file) formData.append("file", file, file.name);

    const res = await fetch("/create_recipe", {
      method: "POST",
      body: formData,
      // No pongas Content-Type: el navegador pone el boundary
    });

    if (!res.ok) {
      setError(await res.text());
      return;
    }

    onCreated();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Nombre</label>
      <input name="title" required />

      <label>Descripcion</label>
      <input name="description" required />

      <div
        {...getRootProps()}
        style={{
          border: file ? "2px solid #6c8c5a" : "2px dashed #aaa",
          borderRadius: "8px",
          padding: "2rem",
          textAlign: "center",
          minHeight: "140px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          background: file ? "#eef3e9" : "transparent",
          cursor: file ? "default" : "pointer",
        }}
      >
        <input {...getInputProps()} />

        {file ? (
          <>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6c8c5a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <span style={{ fontWeight: 600 }}>{file.name}</span>
            <span style={{ fontSize: "0.8rem", color: "#555" }}>
              {(file.size / 1024).toFixed(1)} KB · archivo cargado
            </span>
          </>
        ) : isDragActive ? (
          "Suelta el archivo aquí..."
        ) : (
          "Arrastra un archivo o haz clic para seleccionar"
        )}
      </div>

      {error && (
        <p style={{ color: "#b00020", margin: "0.5rem 0" }} role="alert">
          {error}
        </p>
      )}

      <button type="submit">Enviar</button>
    </form>
  );
}
