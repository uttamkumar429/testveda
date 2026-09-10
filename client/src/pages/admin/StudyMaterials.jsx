import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Crown,
  FileText,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import DashboardLayout from "../../layouts/DashboardLayout";
import adminStudyMaterialService from "../../services/adminStudyMaterialService";

const PAGE_SIZE = 10;

const initialForm = {
  title: "",
  description: "",
  subject: "",
  chapter: "",
  isPaid: false,
  file: null,
};

function StudyMaterials() {
  const [
    materials,
    setMaterials,
  ] = useState([]);

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    uploadLoading,
    setUploadLoading,
  ] = useState(false);

  const [
    deleteLoadingId,
    setDeleteLoadingId,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    form,
    setForm,
  ] = useState(initialForm);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

const loadMaterials = useCallback(
  async (page = 1) => {
    try {
      setLoading(true);

      const response =
        await adminStudyMaterialService.getMaterials({
          page,
          limit: PAGE_SIZE,
          search: search.trim(),
        });

      const data = response?.data?.data;

      setMaterials(
        Array.isArray(data?.materials)
          ? data.materials
          : []
      );

      setPagination(
        data?.pagination || {
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (error) {
      console.error(
        "Admin study materials load failed:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to load study materials."
      );
    } finally {
      setLoading(false);
    }
  },
  [search]
);

useEffect(() => {
  const timer = setTimeout(() => {
    loadMaterials(1);
  }, 300);

  return () => clearTimeout(timer);
}, [search, loadMaterials]);

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
      files,
    } = event.target;

    if (type === "file") {
      setForm((previous) => ({
        ...previous,
        file:
          files?.[0] || null,
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const resetForm = () => {
    setForm(
      initialForm
    );
  };

  const handleUpload =
    async (event) => {
      event.preventDefault();

      if (!form.title.trim()) {
        toast.error(
          "Title is required."
        );
        return;
      }

      if (!form.subject.trim()) {
        toast.error(
          "Subject is required."
        );
        return;
      }

      if (!form.file) {
        toast.error(
          "Please select a PDF file."
        );
        return;
      }

      if (
        form.file.type !==
        "application/pdf"
      ) {
        toast.error(
          "Only PDF files are allowed."
        );
        return;
      }

      try {
        setUploadLoading(
          true
        );

        const formData =
          new FormData();

        formData.append(
          "title",
          form.title.trim()
        );

        formData.append(
          "description",
          form.description.trim()
        );

        formData.append(
          "subject",
          form.subject.trim()
        );

        formData.append(
          "chapter",
          form.chapter.trim()
        );

        formData.append(
          "isPaid",
          String(form.isPaid)
        );

        formData.append(
          "file",
          form.file
        );

        await adminStudyMaterialService.uploadMaterial(
          formData
        );

        toast.success(
          "Study material uploaded successfully."
        );

        resetForm();
        setShowForm(
          false
        );

        await loadMaterials(1);
      } catch (error) {
        console.error(
          "Study material upload failed:",
          error
        );

        toast.error(
          error?.response?.data?.message ||
            "Unable to upload study material."
        );
      } finally {
        setUploadLoading(
          false
        );
      }
    };

  const handleDelete =
    async (material) => {
      if (!material?._id) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete "${material.title}"? This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeleteLoadingId(
          material._id
        );

        await adminStudyMaterialService.deleteMaterial(
          material._id
        );

        toast.success(
          "Study material deleted successfully."
        );

        const nextPage =
          materials.length === 1 &&
          pagination.page >
            1
            ? pagination.page -
              1
            : pagination.page;

        await loadMaterials(
          nextPage
        );
      } catch (error) {
        console.error(
          "Study material delete failed:",
          error
        );

        toast.error(
          error?.response?.data?.message ||
            "Unable to delete study material."
        );
      } finally {
        setDeleteLoadingId(
          null
        );
      }
    };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* HEADER */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Study Materials
            </h1>

            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Upload and manage student learning resources.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowForm(
                (previous) =>
                  !previous
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />

            {showForm
              ? "Close"
              : "Upload Material"}
          </button>
        </div>

        {/* UPLOAD FORM */}

        {showForm ? (
          <form
            onSubmit={
              handleUpload
            }
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <UploadCloud
                  size={22}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Upload Study Material
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  PDF files only.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Title"
                name="title"
                value={form.title}
                onChange={
                  handleChange
                }
                placeholder="e.g. Physics Chapter 1 Notes"
                required
              />

              <Field
                label="Subject"
                name="subject"
                value={form.subject}
                onChange={
                  handleChange
                }
                placeholder="e.g. Physics"
                required
              />

              <Field
                label="Chapter"
                name="chapter"
                value={form.chapter}
                onChange={
                  handleChange
                }
                placeholder="e.g. Motion"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  PDF File
                </label>

                <input
                  type="file"
                  name="file"
                  accept="application/pdf,.pdf"
                  onChange={
                    handleChange
                  }
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Short description..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <input
                  type="checkbox"
                  name="isPaid"
                  checked={
                    form.isPaid
                  }
                  onChange={
                    handleChange
                  }
                  className="h-4 w-4"
                />

                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Crown
                    size={16}
                  />
                  Premium Material
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(
                    false
                  );
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  uploadLoading
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UploadCloud
                  size={18}
                />

                {uploadLoading
                  ? "Uploading..."
                  : "Upload PDF"}
              </button>
            </div>
          </form>
        ) : null}

        {/* SEARCH */}

        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search title, subject or chapter..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4 font-semibold">
                    Material
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Subject
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Access
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : materials.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center"
                    >
                      No study materials found.
                    </td>
                  </tr>
                ) : (
                  materials.map(
                    (material) => (
                      <tr
                        key={
                          material._id
                        }
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              <FileText
                                size={18}
                              />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {
                                  material.title
                                }
                              </p>

                              {material.chapter ? (
                                <p className="text-sm text-slate-500">
                                  {
                                    material.chapter
                                  }
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                          {
                            material.subject
                          }
                        </td>

                        <td className="px-6 py-5">
                          {material.isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Crown
                                size={13}
                              />
                              Premium
                            </span>
                          ) : (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Free
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">
                          {material.createdAt
                            ? new Date(
                                material.createdAt
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : "—"}
                        </td>

                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                material
                              )
                            }
                            disabled={
                              deleteLoadingId ===
                              material._id
                            }
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/20"
                          >
                            <Trash2
                              size={16}
                            />

                            {deleteLoadingId ===
                            material._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          {!loading &&
          pagination.totalPages >
            1 ? (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {pagination.total} materials
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    pagination.page <=
                    1
                  }
                  onClick={() =>
                    loadMaterials(
                      pagination.page -
                        1
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-slate-700"
                >
                  Previous
                </button>

                <span className="px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {
                    pagination.page
                  }{" "}
                  /{" "}
                  {
                    pagination.totalPages
                  }
                </span>

                <button
                  type="button"
                  disabled={
                    pagination.page >=
                    pagination.totalPages
                  }
                  onClick={() =>
                    loadMaterials(
                      pagination.page +
                        1
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>

      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        maxLength={
          name === "title"
            ? 150
            : name === "subject"
              ? 100
              : 150
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900"
      />
    </div>
  );
}

export default StudyMaterials;