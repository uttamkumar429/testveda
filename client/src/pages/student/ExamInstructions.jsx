import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Clock,
  Award,
  Languages,
} from "lucide-react";

import studentExamService from "../../services/studentExamService";

const ExamInstructions = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const exam = state?.exam;

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [materialsError, setMaterialsError] = useState("");

  // ======================================
  // EXAM LANGUAGE
  // ======================================

  const [selectedLanguage, setSelectedLanguage] =
    useState("english");

const isHindi =
  selectedLanguage === "hindi";

const text = isHindi
  ? {
      heading: "परीक्षा निर्देश",

      subHeading:
        "परीक्षा शुरू करने से पहले सभी निर्देश ध्यानपूर्वक पढ़ें।",

      examDetails:
        "परीक्षा विवरण",

      subject:
        "विषय",

      duration:
        "समय अवधि",

      totalMarks:
        "कुल अंक",

      examDate:
        "परीक्षा तिथि",

      examLanguage:
        "परीक्षा की भाषा",

      chooseLanguage:
        "प्रश्न देखने के लिए अपनी पसंदीदा भाषा चुनें।",

      english:
        "अंग्रेज़ी",

      englishDescription:
        "प्रश्न अंग्रेज़ी में देखें।",

      hindi:
        "हिंदी",

      hindiDescription:
        "प्रश्न हिंदी में देखें।",

      importantInstructions:
        "महत्वपूर्ण निर्देश",

      instruction1:
        "हर प्रश्न का उत्तर देने से पहले उसे ध्यानपूर्वक पढ़ें।",

      instruction2:
        "स्टार्ट एग्जाम पर क्लिक करते ही टाइमर शुरू हो जाएगा।",

      instruction3:
        "परीक्षा के दौरान ब्राउज़र को रिफ्रेश या बंद न करें।",

      instruction4:
        "परीक्षा के दौरान सभी उत्तर अपने आप सेव होते रहेंगे।",

      instruction5:
        "आप परीक्षा के दौरान प्रश्नों की भाषा बदल सकते हैं।",

      instruction6:
        "टाइमर समाप्त होने पर परीक्षा अपने आप सबमिट हो जाएगी।",

      instruction7:
        "परीक्षा सबमिट होने के बाद आप अपने उत्तर नहीं बदल सकते।",

      agreement:
        "मैंने सभी निर्देश पढ़ और समझ लिए हैं।",

      back:
        "वापस",

      startExam:
        "परीक्षा शुरू करें",

      starting:
        "परीक्षा शुरू हो रही है...",
    }
  : {
      heading: "Exam Instructions",

      subHeading:
        "Please read all instructions carefully before starting your exam.",

      examDetails:
        "Exam Details",

      subject:
        "Subject",

      duration:
        "Duration",

      totalMarks:
        "Total Marks",

      examDate:
        "Exam Date",

      examLanguage:
        "Exam Language",

      chooseLanguage:
        "Choose your preferred language for viewing questions.",

      english:
        "English",

      englishDescription:
        "View questions in English.",

      hindi:
        "हिंदी",

      hindiDescription:
        "प्रश्न हिंदी में देखें।",

      importantInstructions:
        "Important Instructions",

      instruction1:
        "Read every question carefully before answering.",

      instruction2:
        "Timer starts immediately after clicking Start Exam.",

      instruction3:
        "Do not refresh or close the browser during the exam.",

      instruction4:
        "All answers are auto-saved during the exam.",

      instruction5:
        "You can change the question language during the examination.",

      instruction6:
        "When the timer ends, the exam will be submitted automatically.",

      instruction7:
        "Once submitted, you cannot modify your answers.",

      agreement:
        "I have read and understood all the instructions.",

      back:
        "Back",

      startExam:
        "Start Exam",

      starting:
        "Starting...",
    };
  useEffect(() => {
    let mounted = true;

    const loadMaterials = async () => {
      if (!exam?._id) return;

      try {
        const response = await studentExamService.getMaterials(exam._id);
        if (mounted) {
          setMaterials(response?.data?.materials || []);
          setMaterialsError("");
        }
      } catch (error) {
        if (mounted && exam?.isPaid && exam?.isPurchased) {
          setMaterialsError(
            error?.response?.data?.message ||
              "Study materials could not be loaded."
          );
        }
      }
    };

    loadMaterials();

    return () => {
      mounted = false;
    };
  }, [exam?._id, exam?.isPaid, exam?.isPurchased]);

  // ======================================
  // START EXAM
  // ======================================

  const handleStartExam = async () => {
    if (!exam?._id || loading) {
      return;
    }

    try {
      setLoading(true);

      const response =
        await studentExamService.startExam(
          exam._id
        );

      const attemptId =
        response?.data?.attemptId;

      if (!attemptId) {
        throw new Error(
          "Exam attempt ID was not returned."
        );
      }

      toast.success(
        response?.message ||
          "Exam started successfully."
      );

      navigate(
        `/student/exam/${attemptId}`,
        {
          replace: true,

          state: {
            language: selectedLanguage,
          },
        }
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to start exam."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================
  // EXAM NOT FOUND
  // ======================================

  if (!exam) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Exam Not Found
          </h2>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            The selected exam could not be found.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/student/exams")
            }
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-white transition hover:bg-blue-700"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Heading */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
          {text.examInstructions}
        </h1>

        <p className="mt-2 text-slate-500 dark:text-slate-400">
        {text.readInstructions}
        </p>
      </div>

      {/* Exam Details */}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-6 text-xl font-semibold text-slate-800 dark:text-slate-100">
          {text.examDetails}
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Subject */}

          <div className="flex items-center gap-3">
            <BookOpen className="text-blue-600" />

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {text.subject}
              </p>

              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {exam.subject}
              </h3>
            </div>
          </div>

          {/* Duration */}

          <div className="flex items-center gap-3">
            <Clock className="text-green-600" />

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {text.duration}
              </p>

              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {exam.duration} {text.minutes}
              </h3>
            </div>
          </div>

          {/* Total Marks */}

          <div className="flex items-center gap-3">
            <Award className="text-orange-600" />

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {text.totalMarks}
              </p>

              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {exam.totalMarks}
              </h3>
            </div>
          </div>

          {/* Exam Date */}

          <div className="flex items-center gap-3">
            <Calendar className="text-purple-600" />

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {text.examDate}
              </p>

              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {new Date(
                exam.startTime
              ).toLocaleString(
                isHindi ? "hi-IN" : "en-IN"
              )}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Study Materials */}

      {(materials.length > 0 || materialsError) && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Study Materials
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              PDFs shared for this exam.
            </p>
          </div>

          {materialsError ? (
            <p className="text-sm text-red-600">{materialsError}</p>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <a
                  key={material._id}
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {material.title}
                    </p>
                    {material.description && (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {material.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-blue-600">
                    View PDF
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Language Selection */}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <Languages className="text-blue-600" />

          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              {text.examLanguage}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {text.chooseLanguage}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* English */}

          <button
            type="button"
            onClick={() =>
              setSelectedLanguage("english")
            }
            className={`rounded-xl border p-5 text-left transition ${
              selectedLanguage === "english"
                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-900"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            }`}
          >
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              English
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View questions in English.
            </p>
          </button>

          {/* Hindi */}

          <button
            type="button"
            onClick={() =>
              setSelectedLanguage("hindi")
            }
            className={`rounded-xl border p-5 text-left transition ${
              selectedLanguage === "hindi"
                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-900"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            }`}
          >
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              हिंदी
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              प्रश्न हिंदी में देखें।
            </p>
          </button>
        </div>
      </div>

      {/* Instructions */}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <AlertTriangle className="text-amber-500" />

          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {text.importantInstructions}
          </h2>
        </div>

        <ul className="space-y-3 text-slate-600 dark:text-slate-300">

          <li>
            • {isHindi
              ? "हर प्रश्न का उत्तर देने से पहले उसे ध्यानपूर्वक पढ़ें।"
              : "Read every question carefully before answering."}
          </li>

          <li>
            • {isHindi
              ? "स्टार्ट एग्जाम पर क्लिक करते ही टाइमर शुरू हो जाएगा।"
              : "Timer starts immediately after clicking Start Exam."}
          </li>

          <li>
            • {isHindi
              ? "परीक्षा के दौरान ब्राउज़र को रिफ्रेश या बंद न करें।"
              : "Do not refresh or close the browser during the exam."}
          </li>

          <li>
            • {isHindi
              ? "परीक्षा के दौरान सभी उत्तर अपने आप सेव होते रहेंगे।"
              : "All answers are auto-saved during the exam."}
          </li>

          <li>
            • {isHindi
              ? "आप परीक्षा के दौरान प्रश्नों की भाषा बदल सकते हैं।"
              : "You can change the question language during the examination."}
          </li>

          <li>
            • {isHindi
              ? "टाइमर समाप्त होने पर परीक्षा अपने आप सबमिट हो जाएगी।"
              : "When the timer ends, the exam will be submitted automatically."}
          </li>

          <li>
            • {isHindi
              ? "परीक्षा सबमिट होने के बाद आप अपने उत्तर नहीं बदल सकते।"
              : "Once submitted, you cannot modify your answers."}
          </li>

        </ul>
      </div>

      {/* Agreement */}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) =>
              setAccepted(event.target.checked)
            }
            className="h-5 w-5 accent-blue-600"
          />

          <span className="font-medium">
          {text.agreement}
          </span>
        </label>
      </div>

      {/* Buttons */}

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            navigate("/student/exams")
          }
          className="rounded-lg border border-slate-300 px-6 py-3 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {text.back}
        </button>

        <button
          type="button"
          disabled={!accepted || loading}
          onClick={handleStartExam}
          className={`rounded-lg px-8 py-3 font-medium text-white transition ${
            accepted && !loading
              ? "bg-blue-600 hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-400 dark:bg-slate-700"
          }`}
        >
        {loading
          ? text.starting
          : text.startExam}
        </button>
      </div>
    </div>
  );
};

export default ExamInstructions;