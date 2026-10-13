/**
 * Utilidad de la capa de presentación para la descarga de archivos .ics en el navegador.
 */
export function descargarArchivoICS(
  nombreArchivo: string,
  contenidoICS: string
): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  try {
    const nombre = nombreArchivo.endsWith(".ics")
      ? nombreArchivo
      : `${nombreArchivo}.ics`;

    const blob = new Blob([contenidoICS], {
      type: "text/calendar;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.setAttribute("download", nombre);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 200);

    return true;
  } catch (error) {
    console.error("Error al descargar archivo ICS:", error);
    return false;
  }
}
