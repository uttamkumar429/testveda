import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  BookOpen,
  Crown,
  FileText,
  Lock,
  Search,
  Unlock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import studyMaterialService from "../../services/studyMaterialService";

const PAGE_SIZE = 12;

function StudyMaterials() {
  const navigate = useNavigate();

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
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    subject,
    setSubject,
  ] = useState("");

const loadMaterials = useCallback(
  async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const response =
        await studyMaterialService.getMaterials({
          page,
          limit: PAGE_SIZE,
          search: search.trim(),
          subject: subject.trim(),
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
    } catch (requestError) {
      console.error(
        "Study materials load failed:",
        requestError
      );

      const message =
        requestError?.response?.data?.message ||
        "Unable to load study materials.";

      setError(message);
    } finally {
      setLoading(false);
    }
  },
  [search, subject]
);

useEffect(() => {
  const timer = setTimeout(() => {
    loadMaterials(1);
  }, 300);

  return () => {
    clearTimeout(timer);
  };
}, [search, subject, loadMaterials]);

  const handleOpen = (
    material
  ) => {
    if (!material?._id) {
      return;
    }

    if (
      material.isPaid &&
      !material.accessAllowed
    ) {
      toast.error(
        "Premium access is required."
      );

      navigate(
        "/student/subscription"
      );

      return;
    }

    navigate(
      `/student/study-materials/${material._id}`
    );
  };

  const handlePageChange = (
    page
  ) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.page
    ) {
      return;
    }

    loadMaterials(page);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}

      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <BookOpen size={24} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Study Material
            </h1>

            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Access notes, PDFs and learning resources.
            </p>
          </div>
        </div>
      </div>

      {/* FILTERS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
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
              placeholder="Search study material..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900"
            />
          </div>

          <input
            type="text"
            value={subject}
            onChange={(event) =>
              setSubject(
                event.target.value
              )
            }
            placeholder="Filter by subject"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900"
          />
        </div>
      </div>

      {/* ERROR */}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
            Unable to load study materials
          </h2>

          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadMaterials(
                pagination.page || 1
              )
            }
            className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : null}

      {/* LOADING */}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : null}

      {/* EMPTY */}

      {!loading &&
      !error &&
      materials.length ===
        0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <FileText
            size={42}
            className="mx-auto text-slate-400"
          />

          <h2 className="mt-4 text-xl font-semibold text-slate-800 dark:text-white">
            No study materials found
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Try another search term or subject.
          </p>
        </div>
      ) : null}

      {/* GRID */}

      {!loading &&
      materials.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {materials.map(
            (material) => (
              <article
                key={material._id}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    <FileText
                      size={24}
                    />
                  </div>

                  {material.isPaid ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Crown
                        size={13}
                      />
                      Premium
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Free
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <h2 className="line-clamp-2 text-xl font-bold text-slate-900 dark:text-white">
                    {material.title}
                  </h2>

                  <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    {material.subject}
                  </p>

                  {material.chapter ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {material.chapter}
                    </p>
                  ) : null}

                  {material.description ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {material.description}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto pt-6">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpen(
                        material
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    {material.isPaid &&
                    !material.accessAllowed ? (
                      <>
                        <Lock
                          size={17}
                        />
                        Unlock Material
                      </>
                    ) : (
                      <>
                        <Unlock
                          size={17}
                        />
                        Open PDF
                      </>
                    )}
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      ) : null}

      {/* PAGINATION */}

      {!loading &&
      pagination.totalPages >
        1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={
              pagination.page <= 1
            }
            onClick={() =>
              handlePageChange(
                pagination.page - 1
              )
            }
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
          >
            Previous
          </button>

          {Array.from(
            {
              length:
                pagination.totalPages,
            },
            (_, index) =>
              index + 1
          )
            .filter(
              (page) =>
                Math.abs(
                  page -
                    pagination.page
                ) <= 2
            )
            .map((page) => (
              <button
                key={page}
                type="button"
                onClick={() =>
                  handlePageChange(
                    page
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  page ===
                  pagination.page
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                {page}
              </button>
            ))}

          <button
            type="button"
            disabled={
              pagination.page >=
              pagination.totalPages
            }
            onClick={() =>
              handlePageChange(
                pagination.page + 1
              )
            }
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default StudyMaterials;