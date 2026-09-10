import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import VerifyOtpPage from "../pages/auth/VerifyOtpPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import Students from "../pages/admin/Students";
import Exams from "../pages/admin/Exams";
import Tests from "../pages/admin/Tests";
import Results from "../pages/admin/Results";
import Reports from "../pages/admin/Reports";
import Settings from "../pages/admin/Settings";
import Announcements from "../pages/admin/Announcements";
import CreateAnnouncement from "../pages/admin/CreateAnnouncement";
import EditAnnouncement from "../pages/admin/EditAnnouncement";
import Notifications from "../pages/student/Notifications";
import StudentLayout from "../layouts/StudentLayout";
import StudentDashboard from "../pages/student/StudentDashboard";
import StudentExams from "../pages/student/StudentExams";
import ExamInstructions from "../pages/student/ExamInstructions";
import Questions from "../pages/admin/Questions";
import CreateQuestion from "../pages/admin/CreateQuestion";
import EditQuestion from "../pages/admin/EditQuestion";
import QuestionDetails from "../pages/admin/QuestionDetails";
import CreateTest from "../pages/admin/CreateTest";
import TestDetails from "../pages/admin/TestDetails";
import EditTest from "../pages/admin/EditTest";
import ProfilePage from "../pages/student/ProfilePage";
import StudentSettings from "../pages/student/StudentSettings";
import ResultPage from "../pages/student/ResultPage";
import ResultHistory from "../pages/student/ResultHistory";
import ExamPage from "../pages/student/ExamPage";
import ReviewAnswersPage from "../pages/student/ReviewAnswersPage";
import RoleProtectedRoute from "./RoleProtectedRoute";
import StudentStudyMaterials from "../pages/student/StudyMaterials";
import StudyMaterialViewer from "../pages/student/StudyMaterialViewer";
import AdminStudyMaterials from "../pages/admin/StudyMaterials";
import SubscriptionPage from "../pages/student/SubscriptionPage";

function AppRoutes() {
    
  return (
        <Routes>

        {/* Public Route */}
       <Route path="/" element={<LoginPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route
            path="/register"
            element={<RegisterPage />}
        />

        <Route
            path="/verify-otp"
            element={<VerifyOtpPage />}
        />


        {/* Protected Route */}
        {/* console.log("AppRoutes Rendered"); */}
        <Route
        path="/admin/dashboard"
        element={
        <RoleProtectedRoute allowedRoles={["admin"]}>
         <AdminDashboard />
        </RoleProtectedRoute>
        }
        />
        <Route
            path="/admin/questions"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <Questions />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/questions/create"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <CreateQuestion />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/questions/edit/:id"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <EditQuestion />
               </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/questions/:id"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <QuestionDetails />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/tests/create"
            element={
              <RoleProtectedRoute allowedRoles={["admin"]}>
                <CreateTest />
             </RoleProtectedRoute>
            }
            
        />
        <Route
            path="/admin/tests/:id"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <TestDetails />
               </RoleProtectedRoute>
            }
        />

        <Route
            path="/admin/tests/:id/edit"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <EditTest />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/study-materials"
            element={
                <RoleProtectedRoute allowedRoles={["admin", "superAdmin"]}>
                <AdminStudyMaterials />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/students"
            element={
               <RoleProtectedRoute allowedRoles={["admin"]}>
                <Students />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/exams"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <Exams />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/tests"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <Tests />
               </RoleProtectedRoute>
            }
        />

        <Route
            path="/admin/results"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <Results />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/reports"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <Reports />
                </RoleProtectedRoute>
            }
        />

        <Route
            path="/admin/settings"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <Settings />
               </RoleProtectedRoute>
            }
        />  
        <Route
            path="/admin/announcements"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <Announcements />
               </RoleProtectedRoute>
            }
        /> 
        <Route
            path="/admin/announcements/create"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <CreateAnnouncement />
                </RoleProtectedRoute>
            }
        />
        <Route
            path="/admin/announcements/:id/edit"
            element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                <EditAnnouncement />
                </RoleProtectedRoute>
            }
        />

            <Route
            path="/student"
            element={
                <RoleProtectedRoute allowedRoles={["student"]}>
                <StudentLayout />
                </RoleProtectedRoute>
            }
            >
                <Route path="dashboard" element={<StudentDashboard />} />

                <Route path="profile" element={<ProfilePage />} />
                <Route
                    path="settings"
                    element={<StudentSettings />}
                />
                <Route
                    path="notifications"
                    element={<Notifications />}
                />
                <Route
                    path="study-materials"
                    element={<StudentStudyMaterials />}
                />

                <Route
                    path="study-materials/:id"
                    element={<StudyMaterialViewer />}
                />

                <Route path="exams" element={<StudentExams />} />

                <Route
                    path="exam/instructions"
                    element={<ExamInstructions />}
                />

                <Route
                    path="exam/:attemptId"
                    element={<ExamPage />}
                />
                <Route
                    path="subscription"
                    element={<SubscriptionPage />}
                />

                <Route
                    path="result/:attemptId"
                    element={<ResultPage />}
                />

                <Route
                    path="results/history"
                    element={<ResultHistory />}
                />
                <Route
                    path="result/:attemptId/review"
                    element={<ReviewAnswersPage />}
                />
            </Route>

        </Routes>
    );
}

export default AppRoutes;