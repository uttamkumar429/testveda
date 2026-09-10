
import ExamPage from "../ExamPage";
import {
  beforeEach,
  
  expect,
  test,
  vi,
} from "vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

// ======================================
// MOCK FUNCTIONS
// ======================================
const {
  mockDispatch,
  mockNavigate,
  mockUseSelector,
  mockUseParams,
  mockUseLocation,
  mockFetchExamQuestions,
  mockSaveAnswer,
  mockSubmitExam,
  mockUpdateExamProgress,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseSelector: vi.fn(),
  mockUseParams: vi.fn(),
  mockUseLocation: vi.fn(),

  mockFetchExamQuestions: vi.fn(),
  mockSaveAnswer: vi.fn(),
  mockSubmitExam: vi.fn(),
  mockUpdateExamProgress: vi.fn(),
}));

// ======================================
// MOCK REACT REDUX
// ======================================

vi.mock(
  "react-redux",
  () => ({
    useDispatch: () =>
      mockDispatch,

    useSelector: (selector) =>
      mockUseSelector(selector),
  })
);

// ======================================
// MOCK ROUTER
// ======================================

vi.mock(
  "react-router-dom",
  () => ({
    useNavigate: () =>
      mockNavigate,

    useParams: () =>
      mockUseParams(),

    useLocation: () =>
      mockUseLocation(),
  })
);

// ======================================
// MOCK EXAM THUNKS
// ======================================

vi.mock(
  "../../../redux/studentExam/examThunk",
  () => ({
    fetchExamQuestions:
      mockFetchExamQuestions,

    saveAnswer:
      mockSaveAnswer,

    submitExam:
      mockSubmitExam,

    updateExamProgress:
      mockUpdateExamProgress,
  })
);

// ======================================
// MOCK CHILD COMPONENTS
// ======================================

vi.mock(
  "../../../components/students/exam/SubmitModal",
  () => ({
    default: ({
      isOpen,
      onClose,
      onConfirm,
    }) =>
      isOpen ? (
        <div>
          <button
            type="button"
            onClick={onClose}
          >
            Cancel Submit
          </button>

          <button
            type="button"
            onClick={onConfirm}
          >
            Confirm Submit
          </button>
        </div>
      ) : null,
  })
);
vi.mock(
  "../../../components/students/exam/QuestionCard",
  () => ({
    default: ({
      question,
      questionNumber,
      selectedAnswer,
      onOptionSelect,
    }) => (
      <div>
        <h2>
          {question?.questionText}
        </h2>

        <span>
          Question {questionNumber}
        </span>

        <span>
          Selected:{" "}
          {selectedAnswer || "None"}
        </span>

        <button
          type="button"
          onClick={() =>
            onOptionSelect?.("A")
          }
        >
          Select A
        </button>
      </div>
    ),
  })
);
vi.mock(
  "../../../components/students/exam/QuestionPalette",
  () => ({
    default: () => (
      <div>
        Question Palette
      </div>
    ),
  })
);
vi.mock(
  "../../../components/students/exam/ExamNavigation",
  () => ({
    default: ({
      onPrevious,
      onNext,
      onToggleReview,
      onSubmit,
      isFirstQuestion,
      isLastQuestion,
    }) => (
      <div>
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstQuestion}
        >
          Previous
        </button>

        <button
          type="button"
          onClick={onToggleReview}
        >
          Review
        </button>

        <button
          type="button"
          onClick={onSubmit}
        >
          Submit Exam
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={isLastQuestion}
        >
          Next
        </button>
      </div>
    ),
  })
);
vi.mock(
  "../../../components/students/exam/ExamHeader",
  () => ({
    default: ({
      title,
      subject,
      remainingTime,
    }) => (
      <header>
        <h1>{title}</h1>

        <p>{subject}</p>

        <span>
          {remainingTime}
        </span>
      </header>
    ),
  })
);

// ======================================
// IMPORT COMPONENT AFTER MOCKS
// ======================================



// ======================================
// TEST STATE
// ======================================

const createState = (
  overrides = {}
) => ({
  studentExam: {
    title: "Physics Mock Test",

    subject: "Physics",

    questions: [
      {
        questionId: "q1",

        questionText:
          "What is velocity?",

        marks: 2,

        options: [
          {
            value: "A",
            text: "Speed with direction",
          },
          {
            value: "B",
            text: "Only speed",
          },
          {
            value: "C",
            text: "Only direction",
          },
          {
            value: "D",
            text: "None",
          },
        ],
      },
    ],

    currentQuestionIndex: 0,

    selectedAnswers: {},

    visitedQuestions: {},

    reviewQuestions: {},

    remainingTime: 120,

    loading: false,

    error: null,

    progressSaving: false,
  },

  ...overrides,
});

// ======================================
// SETUP
// ======================================

beforeEach(() => {
  vi.clearAllMocks();

  mockUseParams.mockReturnValue({
    attemptId: "attempt-123",
  });

  mockUseLocation.mockReturnValue({
    state: {
      language: "english",
    },
  });

  mockUseSelector.mockImplementation(
    (selector) =>
      selector(
        createState()
      )
  );

  mockFetchExamQuestions.mockReturnValue(
    {
      type:
        "studentExam/fetchExamQuestions",
    }
  );

  mockSaveAnswer.mockReturnValue(
    {
      type:
        "studentExam/saveAnswer",
    }
  );

  mockUpdateExamProgress.mockReturnValue(
    {
      type:
        "studentExam/updateExamProgress",
    }
  );

  mockSubmitExam.mockReturnValue(
    {
      type:
        "studentExam/submitExam",
    }
  );

  mockDispatch.mockImplementation(
    (action) => ({
      unwrap: vi.fn().mockResolvedValue(
        action?.type ===
          "studentExam/submitExam"
          ? {
              data: {
                status: "SUBMITTED",
              },
            }
          : {
              data: {},
            }
      ),
    })
  );
});

// ======================================
// 1. INVALID ATTEMPT ID
// ======================================

test(
  "Should redirect to exams when attempt ID is missing",
  async () => {
    mockUseParams.mockReturnValue({
      attemptId: undefined,
    });

    render(
      <ExamPage />
    );

    expect(
      mockNavigate
    ).toHaveBeenCalledWith(
      "/student/exams",
      {
        replace: true,
      }
    );

    expect(
      mockFetchExamQuestions
    ).not.toHaveBeenCalled();
  }
);

// ======================================
// 2. LOAD EXAM
// ======================================

test(
  "Should fetch and render the current exam",
  async () => {
    render(
      <ExamPage />
    );

    expect(
      mockFetchExamQuestions
    ).toHaveBeenCalledWith(
      "attempt-123"
    );

    expect(
      mockDispatch
    ).toHaveBeenCalled();

    expect(
      screen.getByRole(
        "heading",
        {
          name:
            "Physics Mock Test",
        }
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "What is velocity?"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Question 1"
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText("120")
    ).toBeInTheDocument();
  }
);

// ======================================
// 3. SUBMIT EXAM
// ======================================

test(
  "Should submit the exam and navigate to result",
  async () => {
    render(
      <ExamPage />
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name:
            "Submit Exam",
        }
      )
    );

    expect(
      screen.getByRole(
        "button",
        {
          name:
            "Confirm Submit",
        }
      )
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name:
            "Confirm Submit",
        }
      )
    );

    await waitFor(() => {
      expect(
        mockSubmitExam
      ).toHaveBeenCalledWith(
        "attempt-123"
      );
    });

    await waitFor(() => {
      expect(
        mockNavigate
      ).toHaveBeenCalledWith(
        "/student/result/attempt-123",
        {
          replace: true,
        }
      );
    });
  }
);

// ======================================
// 4. SELECT ANSWER
// ======================================

test(
  "Should dispatch save answer with current question data",
  async () => {
    render(
      <ExamPage />
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: "Select A",
        }
      )
    );

    await waitFor(() => {
      expect(
        mockSaveAnswer
      ).toHaveBeenCalledWith({
        attemptId: "attempt-123",

        payload: {
          questionId: "q1",

          selectedAnswer: "A",

          currentQuestionIndex: 0,

          timeSpent: expect.any(Number),
        },
      });
    });

    expect(
      mockDispatch
    ).toHaveBeenCalled();
  }
);
