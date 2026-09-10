import { useState } from "react";
import { FileText, Upload, Trash2 } from "lucide-react";

import adminTestService from "../../services/adminTestService";
import { toastService } from "../../lib/toast";

function TestMaterialsManager({ test, onChanged }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  if (test.status !== "draft") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              Study Materials
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Materials are locked after publishing to preserve the published exam snapshot.
            </p>
          </div>
        </div>

        {(test.materials || []).length > 0 ? (
          <div className="mt-5 space-y-3">
            {test.materials.map((material) => (
              <a
                key={material._id}
                href={material.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {material.title}
                  </p>
                  {material.description && (
                    <p className="mt-1 text-sm text-slate-500">
                      {material.description}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-blue-600">
                  View PDF
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500">
            No study materials attached.
          </p>
        )}
      </section>
    );
  }

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!file) {
      toastService.error("Please select a PDF file.");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim() || file.name);
      formData.append("description", description.trim());

      await adminTestService.uploadMaterial(test._id, formData);

      setTitle("");
      setDescription("");
      setFile(null);
      event.target.reset();
      toastService.success("PDF uploaded successfully.");
      await onChanged?.();
    } catch (error) {
      toastService.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to upload PDF."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm("Remove this PDF?")) return;

    try {
      setDeletingId(materialId);
      await adminTestService.deleteMaterial(test._id, materialId);
      toastService.success("PDF removed successfully.");
      await onChanged?.();
    } catch (error) {
      toastService.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to remove PDF."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <FileText className="text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            Study Materials
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Attach PDFs that students can access with this exam.
          </p>
        </div>
      </div>

      <form onSubmit={handleUpload} className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium">PDF Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Physics Revision Notes"
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">PDF File</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block font-medium">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Revision notes, syllabus, solution, etc."
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={18} />
            {saving ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
      </form>

      {(test.materials || []).length > 0 && (
        <div className="mt-7 space-y-3">
          {test.materials.map((material) => (
            <div
              key={material._id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">
                  {material.title}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {material.originalName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(material._id)}
                disabled={deletingId === material._id}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deletingId === material._id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default TestMaterialsManager;
