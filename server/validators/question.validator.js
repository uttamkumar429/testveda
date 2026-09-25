const validateQuestion = (data) => {
  const errors = [];

  const requiredString = (field, label, maxLength) => {
    if (typeof data[field] !== "string" || data[field].trim() === "") {
      errors.push(`${label} is required.`);
    } else if (data[field].trim().length > maxLength) {
      errors.push(`${label} cannot exceed ${maxLength} characters.`);
    }
  };

  requiredString("subject", "Subject", 100);
  requiredString("chapter", "Chapter", 150);
  requiredString("question", "Question", 5000);
  requiredString("questionHindi", "Hindi Question", 5000);

  for (const option of ["A", "B", "C", "D"]) {
    requiredString(`option${option}`, `Option ${option}`, 2000);
    requiredString(
      `option${option}Hindi`,
      `Hindi Option ${option}`,
      2000
    );
  }

  if (!["A", "B", "C", "D"].includes(data.correctAnswer)) {
    errors.push("Correct Answer must be A, B, C or D.");
  }

  if (
    data.difficulty !== undefined &&
    (typeof data.difficulty !== "string" ||
      !["Easy", "Medium", "Hard"].includes(data.difficulty))
  ) {
    errors.push("Difficulty must be Easy, Medium or Hard.");
  }

  if (data.marks === undefined || data.marks === null || data.marks === "") {
    errors.push("Marks are required.");
  } else {
    const numericMarks = Number(data.marks);
    if (!Number.isFinite(numericMarks) || numericMarks < 1) {
      errors.push("Marks must be greater than or equal to 1.");
    } else if (numericMarks > 100) {
      errors.push("Marks cannot exceed 100.");
    }
  }

  if (
    data.negativeMarks === undefined ||
    data.negativeMarks === null ||
    data.negativeMarks === ""
  ) {
    errors.push("Negative Marks are required.");
  } else {
    const numericNegativeMarks = Number(data.negativeMarks);
    if (!Number.isFinite(numericNegativeMarks) || numericNegativeMarks < 0) {
      errors.push("Negative Marks must be greater than or equal to 0.");
    } else if (numericNegativeMarks > 100) {
      errors.push("Negative Marks cannot exceed 100.");
    }
  }

  for (const [field, label] of [
    ["explanation", "Explanation"],
    ["explanationHindi", "Hindi Explanation"],
  ]) {
    if (
      data[field] !== undefined &&
      data[field] !== null &&
      typeof data[field] !== "string"
    ) {
      errors.push(`${label} must be a string.`);
    } else if (
      typeof data[field] === "string" &&
      data[field].trim().length > 5000
    ) {
      errors.push(`${label} cannot exceed 5000 characters.`);
    }
  }

  return errors;
};

module.exports = validateQuestion;
