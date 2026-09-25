import {
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { toast } from "sonner";

import studyMaterialService from "../../services/studyMaterialService";

function StudyMaterialViewer() {
  const navigate =
    useNavigate();

  const { id } =
    useParams();

  const [
    material,
    setMaterial,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    pdfUrl,
    setPdfUrl,
  ] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const loadMaterial =
      async () => {
        try {
          setLoading(true);
          setError("");
          setPdfUrl("");

          const response =
            await studyMaterialService.getMaterialById(
              id
            );

          if (!active) {
            return;
          }

          const materialData =
            response?.data?.data ||
            null;

          if (!materialData?.viewerUrl) {
            throw new Error(
              "Study material PDF URL is unavailable."
            );
          }

          const pdfResponse =
            await fetch(
              materialData.viewerUrl
            );

          if (!pdfResponse.ok) {
            throw new Error(
              "Unable to load the study material PDF."
            );
          }

          const pdfBlob =
            new Blob(
              [await pdfResponse.arrayBuffer()],
              { type: "application/pdf" }
            );

          objectUrl =
            URL.createObjectURL(pdfBlob);

          if (!active) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = "";
            return;
          }

          setMaterial(materialData);
          setPdfUrl(objectUrl);
        } catch (requestError) {
          console.error(
            "Study material open failed:",
            requestError
          );

          if (!active) {
            return;
          }

          const message =
            requestError?.response
              ?.data?.message ||
            requestError?.message ||
            "Unable to open study material.";

          setError(message);

          if (
            requestError?.response
              ?.status === 403
          ) {
            toast.error(
              message
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    if (id) {
      loadMaterial();
    }

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id]);

  const handleBack = () => {
    navigate(
      "/student/study-materials"
    );
  };

  const handleDownload = () => {
    if (!pdfUrl) {
      return;
    }

    window.open(
      pdfUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={42}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-4 font-medium text-slate-600 dark:text-slate-300">
            Opening study material...
          </p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <FileText
            size={42}
            className="mx-auto text-red-500"
          />

          <h1 className="mt-4 text-xl font-bold text-red-700 dark:text-red-400">
            Unable to open material
          </h1>

          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {error ||
              "Study material not found."}
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Study Material
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Back"
          >
            <ArrowLeft
              size={20}
            />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">
              {material.title}
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {material.subject}
              {material.chapter
                ? ` • ${material.chapter}`
                : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            handleDownload
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          <Download size={17} />
          Open PDF
        </button>
      </div>

      {/* VIEWER */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <iframe
          title={material.title}
          src={pdfUrl}
          className="h-[calc(100vh-220px)] min-h-[650px] w-full bg-white"
        />
      </div>
    </div>
  );
}

export default StudyMaterialViewer;