import {
  PrismaClient,
  UserRole,
  AcademicRank,
  EmploymentType,
  ContractStatus,
  PerformanceRating,
  ReviewStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function requestNo(year: number, dateStr: string, seq: number) {
  const seqPad = String(seq).padStart(4, "0");
  return `FPRV${String(year).slice(-2)}-${dateStr}-${seqPad}`;
}

function ratingToScore(r: PerformanceRating): number {
  if (r === "EXCEEDS_EXPECTATIONS") return 95;
  if (r === "MEETS_EXPECTATIONS") return 75;
  return 50;
}

function computeOverall(
  teaching: PerformanceRating,
  research: PerformanceRating,
  service: PerformanceRating
): { score: number; rating: PerformanceRating } {
  const score =
    ratingToScore(teaching) * 0.4 +
    ratingToScore(research) * 0.4 +
    ratingToScore(service) * 0.2;
  const rating: PerformanceRating =
    score >= 88
      ? "EXCEEDS_EXPECTATIONS"
      : score >= 65
      ? "MEETS_EXPECTATIONS"
      : "DOES_NOT_MEET_EXPECTATIONS";
  return { score, rating };
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Institution ────────────────────────────────────────────────────────────
  const institution = await prisma.institution.upsert({
    where: { id: "inst-1" },
    update: {},
    create: {
      id: "inst-1",
      name: "Khalifa University",
      shortName: "KU",
      website: "https://ku.ac.ae",
      address: "P.O. Box 127788, Abu Dhabi, UAE",
    },
  });

  // ── Divisions (Colleges) ───────────────────────────────────────────────────
  const divEng = await prisma.division.upsert({
    where: { code: "ENG" },
    update: {},
    create: {
      id: "div-eng",
      institutionId: institution.id,
      name: "College of Engineering",
      code: "ENG",
      description: "Engineering and applied sciences",
    },
  });

  const divSci = await prisma.division.upsert({
    where: { code: "SCI" },
    update: {},
    create: {
      id: "div-sci",
      institutionId: institution.id,
      name: "College of Arts and Sciences",
      code: "SCI",
      description: "Natural sciences, mathematics, and humanities",
    },
  });

  // ── Departments ────────────────────────────────────────────────────────────
  const deptCIE = await prisma.department.upsert({
    where: { code: "CIE" },
    update: {},
    create: {
      id: "dept-cie",
      divisionId: divEng.id,
      name: "Computer and Information Engineering",
      code: "CIE",
    },
  });

  const deptECE = await prisma.department.upsert({
    where: { code: "ECE" },
    update: {},
    create: {
      id: "dept-ece",
      divisionId: divEng.id,
      name: "Electrical and Computer Engineering",
      code: "ECE",
    },
  });

  const deptMath = await prisma.department.upsert({
    where: { code: "MATH" },
    update: {},
    create: {
      id: "dept-math",
      divisionId: divSci.id,
      name: "Mathematics",
      code: "MATH",
    },
  });

  // ── Admin / Reviewer Users ─────────────────────────────────────────────────
  const adminUsers = [
    { id: "user-provost",   email: "provost@ku.ac.ae",            password: "Provost@123",   role: UserRole.PROVOST },
    { id: "user-hr",        email: "hr.admin@ku.ac.ae",           password: "HRAdmin@123",   role: UserRole.HR_ADMIN },
    { id: "user-committee", email: "review.committee@ku.ac.ae",   password: "Committee@123", role: UserRole.REVIEW_COMMITTEE },
    { id: "user-dean-eng",  email: "dean.engineering@ku.ac.ae",   password: "Dean@Eng123",   role: UserRole.DIVISION_DEAN },
    { id: "user-dean-sci",  email: "dean.sciences@ku.ac.ae",      password: "Dean@Sci123",   role: UserRole.DIVISION_DEAN },
    { id: "user-chair-cie", email: "chair.cie@ku.ac.ae",          password: "Chair@CIE123",  role: UserRole.DEPARTMENT_CHAIR },
    { id: "user-chair-ece", email: "chair.ece@ku.ac.ae",          password: "Chair@ECE123",  role: UserRole.DEPARTMENT_CHAIR },
  ];

  for (const u of adminUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { passwordHash: await hash(u.password) },
      create: { id: u.id, email: u.email, passwordHash: await hash(u.password), role: u.role, isActive: true },
    });
  }

  // ── 10 Faculty + Performance Review data ──────────────────────────────────
  type ReviewDef = {
    reviewDate: string;
    submissionDate?: string;
    status: ReviewStatus;
    managerName: string;
    managerEmpId: string;
    teachingRating: PerformanceRating;
    teachingGoal: string;
    teachingFacultyComment: string;
    teachingChairComment: string;
    teachingChairNarrative: string;
    scholarshipRating: PerformanceRating;
    scholarshipGoal: string;
    scholarshipFacultyComment: string;
    scholarshipChairComment: string;
    scholarshipChairNarrative: string;
    researchOfficeScore: number;
    researchOfficeNotes: string;
    serviceRating: PerformanceRating;
    serviceGoal: string;
    serviceFacultyComment: string;
    serviceChairComment: string;
    serviceChairNarrative: string;
    collegialityRating: PerformanceRating;
    collegialityChairComment: string;
    developmentComments: string[];
    nextTeachingGoal: string;
    nextScholarshipGoal: string;
    nextServiceGoal: string;
    approvals: { activity: string; actorName: string; outcome: string; comments?: string }[];
  };

  type FacDef = {
    userId: string;
    email: string;
    fp: { id: string; employeeId: string; firstName: string; lastName: string; rank: AcademicRank; departmentId: string; divisionId: string; hireDate: Date; specialization: string[]; title: string };
    review: ReviewDef;
  };

  const facultyData: FacDef[] = [
    {
      userId: "user-fac-1", email: "p.sofotasios@ku.ac.ae",
      fp: { id: "fp-fac-1", employeeId: "105224", firstName: "Paschalis", lastName: "Sofotasios", rank: AcademicRank.ASSOCIATE_PROFESSOR, departmentId: deptCIE.id, divisionId: divEng.id, hireDate: new Date("2015-10-20"), specialization: ["Signal Processing", "Communications", "Stochastic Processes"], title: "Associate Professor" },
      review: {
        reviewDate: "2026-02-24", submissionDate: "2026-03-03", status: ReviewStatus.HR_COMPLETED,
        managerName: "Baker Shehadah Mohammad", managerEmpId: "KU576",
        teachingRating: "MEETS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits per calendar year. Support SDP students and coordinate all SDP activities. Submit two SDP projects. Advise 30 undergraduate students.",
        teachingFacultyComment: "Taught CCEN 497, CCEN 498, CCEN 610/784 and CCEN 477 (x2) in Spring 2025, CCEN 477 in Summer 2025, CCEN 497, CCEN 498, CCEN 610/784, CCEN 742, CCEN 703 in Fall 2025. Also became the CCMS SDP Coordinator besides CIE.",
        teachingChairComment: "Dr Paschalis taught 3 courses — a mix of graduate and undergraduate. In addition, he coordinated SDP1/2. His teaching contribution met expectations.",
        teachingChairNarrative: "Thank you, Dr. Paschalis, for your flexibility in taking on responsibilities and supporting our students.",
        scholarshipRating: "MEETS_EXPECTATIONS",
        scholarshipGoal: "Publish 3 Q1-journals — preferably in the top 10%.",
        scholarshipFacultyComment: "4 papers (2 in top 10% and 2 in top 5%) were published. Also, 6 conference papers in flagship IEEE conferences.",
        scholarshipChairComment: "Thank you Dr Paschalis, for meeting expectations by publishing 4 journals in Q1 all in top 10%.",
        scholarshipChairNarrative: "Publish 4 Q1 journals and few conferences — met expectation.",
        researchOfficeScore: 78, researchOfficeNotes: "4 Q1 publications; 6 IEEE conference papers; citation index strong.",
        serviceRating: "EXCEEDS_EXPECTATIONS",
        serviceGoal: "Contribute in departmental, institutional and scientific community activities and outreach.",
        serviceFacultyComment: "Active in 3 CIE committees (Search, UG, PIC). CIE & CCMS SDP Coordinator, WQE Signal Processing Coordinator, Evaluator of Exchange Students, PG Interviews. Area Editor IEEE OJ-COMS, Associate Editor IEEE TCOM and Frontiers, Panel Chair IEEE Healthcom 2025. Mentor of newly recruited Assistant Professor.",
        serviceChairComment: "Curriculum committee member, SDP coordinator, library representative and many professional editorial memberships.",
        serviceChairNarrative: "Thank you for your service to CIE and the profession. One feedback: be more timely in responding to requests.",
        collegialityRating: "MEETS_EXPECTATIONS", collegialityChairComment: "Dr Paschalis is easy to work with and a team player.",
        developmentComments: ["Need a better response to requests from students and colleagues."],
        nextTeachingGoal: "Teach 3-4 courses with acceptable averages and feedback. Submit grades and course files on time. Offer 2 SDPs and advise students satisfactorily. Continue as CIE and CCMS SDP Coordinator.",
        nextScholarshipGoal: "Publish 3 Q1 papers. Submit grant proposal(s) and supervise research students. If possible file IP.",
        nextServiceGoal: "Active member of Search Committee and UG Committee. Contribute to professional organizations. Provide mentorship and participate in required university activities.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Paschalis Sofotasios", outcome: "Agree", comments: "Noted, Dr. Baker. Thank you" },
          { activity: "Chair Approval", actorName: "Baker Mohammad", outcome: "Approve", comments: "Approved" },
          { activity: "Dean Approval", actorName: "Sami Muhaidat", outcome: "Approve", comments: "Thank you for your contributions." },
          { activity: "HR Coordinator", actorName: "Mehra AlSuwaidi", outcome: "HRMS Updated" },
        ],
      },
    },
    {
      userId: "user-fac-2", email: "m.alhosani@ku.ac.ae",
      fp: { id: "fp-fac-2", employeeId: "104521", firstName: "Mariam", lastName: "Al-Hosani", rank: AcademicRank.ASSISTANT_PROFESSOR, departmentId: deptCIE.id, divisionId: divEng.id, hireDate: new Date("2019-08-01"), specialization: ["Machine Learning", "Computer Vision", "AI"], title: "Assistant Professor" },
      review: {
        reviewDate: "2026-02-15", submissionDate: "2026-02-20", status: ReviewStatus.COMPLETED,
        managerName: "Baker Shehadah Mohammad", managerEmpId: "KU576",
        teachingRating: "EXCEEDS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits. Develop two new electives in AI. Advise 20 UG students.",
        teachingFacultyComment: "Taught CCEN 301, CCEN 450 (AI elective — new), CCEN 520 and CCEN 560. Introduced project-based learning. Advised 24 students.",
        teachingChairComment: "Dr Mariam delivered outstanding teaching performance with excellent student feedback scores averaging 4.6/5.",
        teachingChairNarrative: "Dr Al-Hosani exceeded expectations in teaching by introducing innovative pedagogical approaches.",
        scholarshipRating: "MEETS_EXPECTATIONS",
        scholarshipGoal: "Publish 2 Q1 papers. Submit one grant proposal.",
        scholarshipFacultyComment: "Published 2 Q1 papers in IEEE Transactions. Submitted one NPRP grant proposal (under review).",
        scholarshipChairComment: "Scholarship targets achieved. Encourage more international collaborations.",
        scholarshipChairNarrative: "Met publication targets and submitted a competitive grant proposal.",
        researchOfficeScore: 72, researchOfficeNotes: "2 Q1 publications; 1 grant submitted; active collaboration with UAE AI centre.",
        serviceRating: "MEETS_EXPECTATIONS",
        serviceGoal: "Serve on curriculum committee and participate in accreditation activities.",
        serviceFacultyComment: "Active member of Curriculum Committee, participated in ABET accreditation preparation, helped organize CIE Open Day.",
        serviceChairComment: "Good committee contributions. Accreditation support appreciated.",
        serviceChairNarrative: "Met service expectations with meaningful contribution to accreditation activities.",
        collegialityRating: "EXCEEDS_EXPECTATIONS", collegialityChairComment: "Dr Mariam is an exceptional colleague, always responsive and collaborative.",
        developmentComments: ["Consider applying for a major research grant (NPRP or similar) in 2026.", "Develop a graduate-level course in Deep Learning."],
        nextTeachingGoal: "Teach 3 courses. Launch Deep Learning graduate course. Maintain high student satisfaction. Advise 25 UG students.",
        nextScholarshipGoal: "Publish 3 Q1 papers. Secure at least one funded research grant. Supervise 2 graduate students.",
        nextServiceGoal: "Lead curriculum sub-committee for AI track. Continue ABET accreditation contributions.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Mariam Al-Hosani", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Baker Mohammad", outcome: "Approve", comments: "Approved — excellent performance" },
          { activity: "Dean Approval", actorName: "Sami Muhaidat", outcome: "Approve", comments: "Congratulations on exceeding expectations." },
          { activity: "HR Coordinator", actorName: "Mehra AlSuwaidi", outcome: "HRMS Updated" },
        ],
      },
    },
    {
      userId: "user-fac-3", email: "k.almansoori@ku.ac.ae",
      fp: { id: "fp-fac-3", employeeId: "103887", firstName: "Khalid", lastName: "Al-Mansoori", rank: AcademicRank.PROFESSOR, departmentId: deptECE.id, divisionId: divEng.id, hireDate: new Date("2010-01-15"), specialization: ["Power Systems", "Renewable Energy", "Smart Grid"], title: "Professor" },
      review: {
        reviewDate: "2026-02-10", submissionDate: "2026-02-14", status: ReviewStatus.COMPLETED,
        managerName: "Nasser Al-Dhaheri", managerEmpId: "KU412",
        teachingRating: "MEETS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits including graduate courses. Supervise 4 graduate students.",
        teachingFacultyComment: "Taught ECCE 301, ECCE 501, ECCE 601 and co-taught ECCE 680. Supervised 4 MSc students (2 graduated). Student ratings averaged 4.1/5.",
        teachingChairComment: "Prof Khalid maintained consistent teaching quality across undergraduate and graduate levels.",
        teachingChairNarrative: "Teaching contribution met expectations. Graduate supervision is a key strength.",
        scholarshipRating: "EXCEEDS_EXPECTATIONS",
        scholarshipGoal: "Publish 4 Q1 papers. Lead one major funded project.",
        scholarshipFacultyComment: "Published 5 Q1 papers (3 in top 5%). Leading a USD 1.2M ADEK-funded smart grid project. Filed 1 patent.",
        scholarshipChairComment: "Exceptional research output. Patent filing and major grant are noteworthy achievements.",
        scholarshipChairNarrative: "Prof Al-Mansoori significantly exceeded research targets.",
        researchOfficeScore: 94, researchOfficeNotes: "5 Q1 publications; 1 patent filed; USD 1.2M active grant; 3 conference papers.",
        serviceRating: "EXCEEDS_EXPECTATIONS",
        serviceGoal: "Chair the Research Committee. Represent ECE in accreditation. Engage with industry.",
        serviceFacultyComment: "Chaired ECE Research Committee, led ABET self-study for 2 programs, organized IEEE UAE Power & Energy Society chapter event, mentored 2 junior faculty.",
        serviceChairComment: "Outstanding service contributions at departmental and national level.",
        serviceChairNarrative: "Prof Al-Mansoori's service exceeded all expectations with significant institutional impact.",
        collegialityRating: "EXCEEDS_EXPECTATIONS", collegialityChairComment: "A true leader and mentor — respected by students and colleagues alike.",
        developmentComments: ["Pursue Distinguished Professor promotion in 2027.", "Strengthen international collaboration network."],
        nextTeachingGoal: "Teach 9 credits. Supervise 5 graduate students. Develop an industry-linked capstone project.",
        nextScholarshipGoal: "Publish 4 Q1 papers. Submit 2 grant proposals. Commercialize patent pending.",
        nextServiceGoal: "Continue as Research Committee Chair. Represent KU in UAE Smart Grid national committee.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Khalid Al-Mansoori", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Nasser Al-Dhaheri", outcome: "Approve", comments: "Exemplary performance" },
          { activity: "Dean Approval", actorName: "Sami Muhaidat", outcome: "Approve", comments: "Highly commendable." },
          { activity: "HR Coordinator", actorName: "Mehra AlSuwaidi", outcome: "HRMS Updated" },
        ],
      },
    },
    {
      userId: "user-fac-4", email: "s.benali@ku.ac.ae",
      fp: { id: "fp-fac-4", employeeId: "106134", firstName: "Sara", lastName: "Benali", rank: AcademicRank.ASSISTANT_PROFESSOR, departmentId: deptMath.id, divisionId: divSci.id, hireDate: new Date("2021-08-01"), specialization: ["Applied Mathematics", "Numerical Analysis", "Optimization"], title: "Assistant Professor" },
      review: {
        reviewDate: "2026-02-18", submissionDate: "2026-02-25", status: ReviewStatus.DEAN_APPROVED,
        managerName: "Omar Al-Rashidi", managerEmpId: "KU388",
        teachingRating: "MEETS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits. Develop one new undergraduate course in Numerical Methods. Advise 15 students.",
        teachingFacultyComment: "Taught MATH 201, MATH 301 (Numerical Methods — new), and MATH 401. Advised 18 students. Strong student feedback on course design.",
        teachingChairComment: "Dr Benali successfully introduced a new course and maintained good teaching standards.",
        teachingChairNarrative: "Teaching performance met expectations with a successful new course launch.",
        scholarshipRating: "MEETS_EXPECTATIONS",
        scholarshipGoal: "Publish 2 Q1 papers. Collaborate with engineering faculty on interdisciplinary research.",
        scholarshipFacultyComment: "Published 2 Q1 papers. Co-authored one paper with ECE faculty on optimization algorithms for smart systems.",
        scholarshipChairComment: "Publications targets met. Interdisciplinary collaboration is commendable.",
        scholarshipChairNarrative: "Met publication expectations with growing interdisciplinary output.",
        researchOfficeScore: 70, researchOfficeNotes: "2 Q1 publications; 1 interdisciplinary paper; 2 conference papers.",
        serviceRating: "MEETS_EXPECTATIONS",
        serviceGoal: "Serve on Undergraduate Studies Committee. Contribute to department events.",
        serviceFacultyComment: "Active member of UG Studies Committee. Organized KU Mathematics Olympiad. Peer reviewer for 3 journals.",
        serviceChairComment: "Good departmental citizenship. Mathematics Olympiad initiative was excellent.",
        serviceChairNarrative: "Service contribution met expectations.",
        collegialityRating: "MEETS_EXPECTATIONS", collegialityChairComment: "Dr Benali is collegial and approachable. Continues to integrate well with the team.",
        developmentComments: ["Work towards submitting a grant proposal in 2026.", "Consider applying for a teaching award."],
        nextTeachingGoal: "Teach 3-4 courses. Maintain high teaching quality. Develop a graduate-level optimization course.",
        nextScholarshipGoal: "Publish 2-3 Q1 papers. Submit one grant proposal. Present at 2 international conferences.",
        nextServiceGoal: "Continue on UG Committee. Take on a mentoring role for new faculty if available.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Sara Benali", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Omar Al-Rashidi", outcome: "Approve" },
          { activity: "Dean Approval", actorName: "Fatima Al-Zaabi", outcome: "Approve", comments: "Good progress." },
        ],
      },
    },
    {
      userId: "user-fac-5", email: "a.youssef@ku.ac.ae",
      fp: { id: "fp-fac-5", employeeId: "102765", firstName: "Ahmed", lastName: "Youssef", rank: AcademicRank.ASSOCIATE_PROFESSOR, departmentId: deptECE.id, divisionId: divEng.id, hireDate: new Date("2014-08-01"), specialization: ["Wireless Communications", "5G/6G", "MIMO Systems"], title: "Associate Professor" },
      review: {
        reviewDate: "2026-02-12", submissionDate: "2026-02-19", status: ReviewStatus.COMPLETED,
        managerName: "Nasser Al-Dhaheri", managerEmpId: "KU412",
        teachingRating: "MEETS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits. Supervise 3 graduate students. Maintain course quality.",
        teachingFacultyComment: "Taught ECCE 410, ECCE 510, ECCE 610, ECCE 710. Supervised 3 MSc students. Good teaching evaluations.",
        teachingChairComment: "Dr Ahmed meets teaching requirements consistently.",
        teachingChairNarrative: "Teaching contribution met expectations.",
        scholarshipRating: "EXCEEDS_EXPECTATIONS",
        scholarshipGoal: "Publish 3 Q1 papers. Seek one international collaboration.",
        scholarshipFacultyComment: "Published 4 Q1 papers (2 in top 5%). Collaborated with TU Delft on 6G channel modeling. Invited keynote at IEEE VTC 2025.",
        scholarshipChairComment: "Excellent scholarship output — 4 Q1 papers and international collaboration outstanding.",
        scholarshipChairNarrative: "Research output significantly exceeded expectations.",
        researchOfficeScore: 90, researchOfficeNotes: "4 Q1 publications; 1 invited keynote; international collaboration with TU Delft.",
        serviceRating: "MEETS_EXPECTATIONS",
        serviceGoal: "Serve on Research Committee. IEEE chapter involvement.",
        serviceFacultyComment: "Member of ECE Research Committee. Organized IEEE ComSoc Abu Dhabi chapter seminar series.",
        serviceChairComment: "Good service contribution with IEEE involvement.",
        serviceChairNarrative: "Service met expectations.",
        collegialityRating: "MEETS_EXPECTATIONS", collegialityChairComment: "Dr Ahmed is professional and cooperative.",
        developmentComments: ["Pursue promotion to Professor track in 2027."],
        nextTeachingGoal: "Teach 9 credits. Develop a 6G communications graduate course.",
        nextScholarshipGoal: "Publish 4 Q1 papers. Secure international research funding. Supervise 2 PhD students.",
        nextServiceGoal: "Lead IEEE ComSoc Abu Dhabi chapter. Serve on IEEE conference TPC.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Ahmed Youssef", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Nasser Al-Dhaheri", outcome: "Approve" },
          { activity: "Dean Approval", actorName: "Sami Muhaidat", outcome: "Approve", comments: "Strong research profile." },
          { activity: "HR Coordinator", actorName: "Mehra AlSuwaidi", outcome: "HRMS Updated" },
        ],
      },
    },
    {
      userId: "user-fac-6", email: "l.hassan@ku.ac.ae",
      fp: { id: "fp-fac-6", employeeId: "107002", firstName: "Layla", lastName: "Hassan", rank: AcademicRank.INSTRUCTOR, departmentId: deptCIE.id, divisionId: divEng.id, hireDate: new Date("2023-01-10"), specialization: ["Database Systems", "Software Engineering"], title: "Instructor" },
      review: {
        reviewDate: "2026-02-20", submissionDate: "2026-02-28", status: ReviewStatus.CHAIR_REVIEW,
        managerName: "Baker Shehadah Mohammad", managerEmpId: "KU576",
        teachingRating: "MEETS_EXPECTATIONS",
        teachingGoal: "Teach 12 credits. Maintain student satisfaction above 3.8/5.",
        teachingFacultyComment: "Taught CCEN 201, CCEN 202, CCEN 310, CCEN 311. Student evaluations averaged 3.9/5. Introduced lab-based assessments.",
        teachingChairComment: "Dr Hassan met teaching load and maintained satisfactory quality.",
        teachingChairNarrative: "Teaching performance meets expectations for instructor rank.",
        scholarshipRating: "MEETS_EXPECTATIONS",
        scholarshipGoal: "Publish 1 conference paper. Explore research collaboration.",
        scholarshipFacultyComment: "Published 1 paper at IEEE ICSCA 2025. Initiated collaboration with industry partner on database project.",
        scholarshipChairComment: "Good for instructor rank — one conference paper achieved.",
        scholarshipChairNarrative: "Scholarship output at expected level for rank.",
        researchOfficeScore: 55, researchOfficeNotes: "1 conference paper; industry collaboration initiated.",
        serviceRating: "MEETS_EXPECTATIONS",
        serviceGoal: "Assist with lab coordination. Support student clubs.",
        serviceFacultyComment: "Lab coordinator for CIE undergraduate labs. Faculty advisor for Coding Club.",
        serviceChairComment: "Good lab and student club support.",
        serviceChairNarrative: "Service contribution meets expectations.",
        collegialityRating: "MEETS_EXPECTATIONS", collegialityChairComment: "Dr Hassan is cooperative and enthusiastic.",
        developmentComments: ["Consider pursuing a PhD in the next 2-3 years to advance academic career.", "Attend a pedagogy workshop."],
        nextTeachingGoal: "Teach 12 credits. Target student satisfaction above 4.0/5.",
        nextScholarshipGoal: "Publish 1-2 papers. Finalize industry collaboration research.",
        nextServiceGoal: "Continue lab coordination. Expand Coding Club activities.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Layla Hassan", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Baker Mohammad", outcome: "Pending" },
        ],
      },
    },
    {
      userId: "user-fac-7", email: "o.farooq@ku.ac.ae",
      fp: { id: "fp-fac-7", employeeId: "101999", firstName: "Omar", lastName: "Farooq", rank: AcademicRank.PROFESSOR, departmentId: deptECE.id, divisionId: divEng.id, hireDate: new Date("2007-08-01"), specialization: ["Biomedical Engineering", "Neural Signal Processing", "Medical Devices"], title: "Professor" },
      review: {
        reviewDate: "2026-02-08", submissionDate: "2026-02-13", status: ReviewStatus.COMPLETED,
        managerName: "Nasser Al-Dhaheri", managerEmpId: "KU412",
        teachingRating: "MEETS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits. Supervise 5 graduate students. Deliver quality graduate instruction.",
        teachingFacultyComment: "Taught ECCE 505, ECCE 601, ECCE 705. Supervised 5 graduate students (1 PhD defended). High-quality graduate seminars.",
        teachingChairComment: "Prof Farooq maintains strong graduate teaching. PhD supervision noteworthy.",
        teachingChairNarrative: "Teaching met expectations with strong graduate focus.",
        scholarshipRating: "MEETS_EXPECTATIONS",
        scholarshipGoal: "Publish 3 Q1 papers. Lead ongoing NIH-linked research.",
        scholarshipFacultyComment: "Published 3 Q1 papers. Continuing USD 800K NIH-linked collaborative project. 2 conference papers.",
        scholarshipChairComment: "Consistent publication output and strong ongoing research funding.",
        scholarshipChairNarrative: "Research targets met. Ongoing funded project is a significant asset.",
        researchOfficeScore: 80, researchOfficeNotes: "3 Q1 papers; ongoing USD 800K collaborative project; 2 conference papers.",
        serviceRating: "MEETS_EXPECTATIONS",
        serviceGoal: "Chair Graduate Studies Committee. Lead ethics board reviews.",
        serviceFacultyComment: "Chaired Graduate Studies Committee. Reviewed 12 ethics applications. Represented ECE in Graduate Council.",
        serviceChairComment: "Solid leadership in Graduate Studies Committee.",
        serviceChairNarrative: "Service contribution met expectations with committee leadership.",
        collegialityRating: "MEETS_EXPECTATIONS", collegialityChairComment: "Prof Farooq is experienced, collegial and a key pillar of the department.",
        developmentComments: ["Explore KU Distinguished Professor pathway."],
        nextTeachingGoal: "Teach 9 credits. Supervise 5 graduate students. Expand PhD program.",
        nextScholarshipGoal: "Publish 3-4 Q1 papers. Renew funded project. File 1 patent in biomedical area.",
        nextServiceGoal: "Continue Graduate Studies Committee leadership. Strengthen industry links.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Omar Farooq", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Nasser Al-Dhaheri", outcome: "Approve" },
          { activity: "Dean Approval", actorName: "Sami Muhaidat", outcome: "Approve", comments: "Consistent strong performance." },
          { activity: "HR Coordinator", actorName: "Mehra AlSuwaidi", outcome: "HRMS Updated" },
        ],
      },
    },
    {
      userId: "user-fac-8", email: "n.petrov@ku.ac.ae",
      fp: { id: "fp-fac-8", employeeId: "105677", firstName: "Nadia", lastName: "Petrov", rank: AcademicRank.ASSOCIATE_PROFESSOR, departmentId: deptMath.id, divisionId: divSci.id, hireDate: new Date("2016-08-01"), specialization: ["Statistics", "Probability", "Data Science"], title: "Associate Professor" },
      review: {
        reviewDate: "2026-02-22", submissionDate: "2026-03-01", status: ReviewStatus.FACULTY_SUBMITTED,
        managerName: "Omar Al-Rashidi", managerEmpId: "KU388",
        teachingRating: "EXCEEDS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits. Develop a data science certificate program. Advise 20 UG/PG students.",
        teachingFacultyComment: "Taught MATH 350, MATH 451, MATH 550, MATH 551. Developed and launched a 3-course Data Science Certificate (approved by Senate). Advised 22 students. Teaching evaluations averaged 4.7/5.",
        teachingChairComment: "Dr Petrov's development of the Data Science Certificate is a landmark achievement for the department.",
        teachingChairNarrative: "Teaching significantly exceeded expectations with curriculum innovation.",
        scholarshipRating: "EXCEEDS_EXPECTATIONS",
        scholarshipGoal: "Publish 3 Q1 papers. Lead a collaborative data science project.",
        scholarshipFacultyComment: "Published 4 Q1 papers (all top 10%). Secured AED 350K internal grant for UAE mobility data analysis. Invited speaker at IMS Annual Meeting 2025.",
        scholarshipChairComment: "Outstanding research output with successful internal grant and international recognition.",
        scholarshipChairNarrative: "Research output clearly exceeded expectations.",
        researchOfficeScore: 92, researchOfficeNotes: "4 Q1 papers (top 10%); AED 350K internal grant; invited international speaker.",
        serviceRating: "MEETS_EXPECTATIONS",
        serviceGoal: "Serve on Senate Academic Committee. Support division accreditation.",
        serviceFacultyComment: "Member of Senate Academic Committee. Contributed to NCAAA accreditation preparation for Mathematics program.",
        serviceChairComment: "Dr Petrov's Senate involvement is appreciated.",
        serviceChairNarrative: "Service meets expectations.",
        collegialityRating: "EXCEEDS_EXPECTATIONS", collegialityChairComment: "Dr Petrov is an inspiration to colleagues — her positive energy elevates the whole team.",
        developmentComments: ["Explore external grant funding (UAE National Research Foundation).", "Consider Associate Editor role in a statistics journal."],
        nextTeachingGoal: "Teach 9 credits. Expand Data Science Certificate to full minor. Supervise 2 MSc students.",
        nextScholarshipGoal: "Publish 3 Q1 papers. Submit NRF grant. Continue UAE mobility data project.",
        nextServiceGoal: "Continue Senate representation. Serve as Data Science Certificate Program Director.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Nadia Petrov", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Omar Al-Rashidi", outcome: "Pending" },
        ],
      },
    },
    {
      userId: "user-fac-9", email: "r.almazroui@ku.ac.ae",
      fp: { id: "fp-fac-9", employeeId: "103311", firstName: "Rashid", lastName: "Al-Mazroui", rank: AcademicRank.ASSISTANT_PROFESSOR, departmentId: deptECE.id, divisionId: divEng.id, hireDate: new Date("2018-01-15"), specialization: ["Robotics", "Control Systems", "Autonomous Vehicles"], title: "Assistant Professor" },
      review: {
        reviewDate: "2026-02-17", submissionDate: "2026-02-24", status: ReviewStatus.COMPLETED,
        managerName: "Nasser Al-Dhaheri", managerEmpId: "KU412",
        teachingRating: "MEETS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits. Launch Robotics Lab. Advise 2 UG capstone teams.",
        teachingFacultyComment: "Taught ECCE 330, ECCE 430, ECCE 531. Launched ECE Robotics Lab with industry sponsorship. Advised 2 capstone teams (both won internal awards).",
        teachingChairComment: "Dr Rashid's Robotics Lab launch is a significant addition to ECE.",
        teachingChairNarrative: "Teaching met expectations; Lab launch is commendable.",
        scholarshipRating: "MEETS_EXPECTATIONS",
        scholarshipGoal: "Publish 2 Q1 papers. Submit one grant for robotics research.",
        scholarshipFacultyComment: "Published 2 Q1 papers. Submitted ADEK robotics grant (AED 200K, pending decision).",
        scholarshipChairComment: "Good publication output and a promising grant submission.",
        scholarshipChairNarrative: "Research targets met.",
        researchOfficeScore: 68, researchOfficeNotes: "2 Q1 papers; 1 grant submitted AED 200K; 2 IEEE Robotics conference papers.",
        serviceRating: "EXCEEDS_EXPECTATIONS",
        serviceGoal: "Serve on Industry Liaison Committee. Organize robotics outreach.",
        serviceFacultyComment: "Chair of Industry Liaison Committee (secured 3 new MoUs). Organized KU Robotics Challenge (120 participants). Mentored 3 junior faculty.",
        serviceChairComment: "Exceptional industry engagement — MoU signings and Robotics Challenge are outstanding.",
        serviceChairNarrative: "Service significantly exceeded expectations.",
        collegialityRating: "MEETS_EXPECTATIONS", collegialityChairComment: "Dr Rashid is energetic and collaborative — great team player.",
        developmentComments: ["Pursue Associate Professor promotion in 2026.", "Expand international research network in robotics."],
        nextTeachingGoal: "Teach 9 credits. Expand Robotics Lab capabilities. Offer a graduate Autonomous Vehicles course.",
        nextScholarshipGoal: "Publish 3 Q1 papers. Secure ADEK grant. Initiate international robotics collaboration.",
        nextServiceGoal: "Continue Industry Liaison Chair. Grow KU Robotics Challenge to national level.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Rashid Al-Mazroui", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Nasser Al-Dhaheri", outcome: "Approve", comments: "Excellent service work" },
          { activity: "Dean Approval", actorName: "Sami Muhaidat", outcome: "Approve", comments: "Industry engagement is impressive." },
          { activity: "HR Coordinator", actorName: "Mehra AlSuwaidi", outcome: "HRMS Updated" },
        ],
      },
    },
    {
      userId: "user-fac-10", email: "e.voronova@ku.ac.ae",
      fp: { id: "fp-fac-10", employeeId: "104098", firstName: "Elena", lastName: "Voronova", rank: AcademicRank.ASSOCIATE_PROFESSOR, departmentId: deptCIE.id, divisionId: divEng.id, hireDate: new Date("2013-08-01"), specialization: ["Cybersecurity", "Cryptography", "Network Security"], title: "Associate Professor" },
      review: {
        reviewDate: "2026-02-14", submissionDate: "2026-02-21", status: ReviewStatus.COMPLETED,
        managerName: "Baker Shehadah Mohammad", managerEmpId: "KU576",
        teachingRating: "MEETS_EXPECTATIONS",
        teachingGoal: "Teach 9 credits. Develop a Cybersecurity graduate track. Advise 25 students.",
        teachingFacultyComment: "Taught CCEN 461, CCEN 562, CCEN 661, CCEN 761. Cybersecurity graduate track approved and enrolling. Advised 28 students. Teaching evals averaged 4.2/5.",
        teachingChairComment: "Dr Voronova successfully developed the Cybersecurity graduate track — a major contribution.",
        teachingChairNarrative: "Teaching met expectations with curriculum development achievement.",
        scholarshipRating: "MEETS_EXPECTATIONS",
        scholarshipGoal: "Publish 3 Q1 papers. Maintain active research funding.",
        scholarshipFacultyComment: "Published 3 Q1 papers. Active NATA-funded project on critical infrastructure security (AED 450K). 3 conference papers at IEEE S&P, CCS.",
        scholarshipChairComment: "Good publication record with prestigious conference presence (IEEE S&P, CCS).",
        scholarshipChairNarrative: "Research targets met with excellent venue quality.",
        researchOfficeScore: 76, researchOfficeNotes: "3 Q1 papers; AED 450K active grant; papers at IEEE S&P and CCS (top-tier venues).",
        serviceRating: "MEETS_EXPECTATIONS",
        serviceGoal: "Lead Cybersecurity track committee. Contribute to national cybersecurity initiative.",
        serviceFacultyComment: "Chair of Cybersecurity Curriculum Committee. Represented KU at UAE Cybersecurity Council technical forum. Peer reviewer for 5 journals.",
        serviceChairComment: "Good service at institutional and national level.",
        serviceChairNarrative: "Service meets expectations.",
        collegialityRating: "MEETS_EXPECTATIONS", collegialityChairComment: "Dr Voronova is reliable and collaborative — a strong contributor to departmental culture.",
        developmentComments: ["Explore industry certifications or partnership programs for Cybersecurity track.", "Consider a leadership development program."],
        nextTeachingGoal: "Teach 9 credits. Run first full cohort of Cybersecurity graduate track. Advise 30 students.",
        nextScholarshipGoal: "Publish 3 Q1 papers. Renew NATA grant. Pursue a second research grant.",
        nextServiceGoal: "Lead Cybersecurity Program Committee. Deepen UAE Cybersecurity Council collaboration.",
        approvals: [
          { activity: "Faculty Endorsement", actorName: "Elena Voronova", outcome: "Agree" },
          { activity: "Chair Approval", actorName: "Baker Mohammad", outcome: "Approve" },
          { activity: "Dean Approval", actorName: "Sami Muhaidat", outcome: "Approve", comments: "Strong and consistent." },
          { activity: "HR Coordinator", actorName: "Mehra AlSuwaidi", outcome: "HRMS Updated" },
        ],
      },
    },
  ];

  let reviewSeq = 1330;

  for (const fac of facultyData) {
    await prisma.user.upsert({
      where: { id: fac.userId },
      update: { passwordHash: await hash("Faculty@123") },
      create: { id: fac.userId, email: fac.email, passwordHash: await hash("Faculty@123"), role: UserRole.FACULTY, isActive: true },
    });

    await prisma.facultyProfile.upsert({
      where: { userId: fac.userId },
      update: {},
      create: {
        id: fac.fp.id,
        userId: fac.userId,
        employeeId: fac.fp.employeeId,
        firstName: fac.fp.firstName,
        lastName: fac.fp.lastName,
        rank: fac.fp.rank,
        departmentId: fac.fp.departmentId,
        divisionId: fac.fp.divisionId,
        specialization: fac.fp.specialization,
        employmentType: EmploymentType.FULL_TIME,
        hireDate: fac.fp.hireDate,
        title: fac.fp.title,
      },
    });

    const contractNum = `KU-2024-${fac.fp.employeeId}`;
    await prisma.contract.upsert({
      where: { contractNumber: contractNum },
      update: {},
      create: {
        facultyId: fac.fp.id,
        contractNumber: contractNum,
        startDate: new Date("2024-08-01"),
        endDate: new Date("2026-07-31"),
        status: ContractStatus.ACTIVE,
        position: fac.fp.title,
      },
    });

    const r = fac.review;
    const dateStr = r.reviewDate.replace(/-/g, "").slice(0, 8);
    const reqNo = requestNo(2025, dateStr, reviewSeq++);
    const { score, rating } = computeOverall(r.teachingRating, r.scholarshipRating, r.serviceRating);

    const existing = await prisma.performanceReview.findUnique({ where: { requestNo: reqNo } });
    if (!existing) {
      const rev = await prisma.performanceReview.create({
        data: {
          requestNo: reqNo,
          facultyId: fac.fp.id,
          reviewYear: 2025,
          reviewDate: new Date(r.reviewDate),
          submissionDate: r.submissionDate ? new Date(r.submissionDate) : null,
          status: r.status,
          managerName: r.managerName,
          managerEmpId: r.managerEmpId,
          teachingWeight: 40,
          teachingGoal: r.teachingGoal,
          teachingTarget: r.teachingGoal,
          teachingOutcome: r.teachingRating === "MEETS_EXPECTATIONS" ? "Meet Expectations" : r.teachingRating === "EXCEEDS_EXPECTATIONS" ? "Exceeds Expectations" : "Does Not Meet Expectations",
          teachingFacultyComment: r.teachingFacultyComment,
          teachingChairComment: r.teachingChairComment,
          teachingChairNarrative: r.teachingChairNarrative,
          teachingRating: r.teachingRating,
          scholarshipWeight: 40,
          scholarshipGoal: r.scholarshipGoal,
          scholarshipTarget: r.scholarshipGoal,
          scholarshipOutcome: r.scholarshipRating === "MEETS_EXPECTATIONS" ? "Meet Expectations" : r.scholarshipRating === "EXCEEDS_EXPECTATIONS" ? "Exceeds Expectations" : "Does Not Meet Expectations",
          scholarshipFacultyComment: r.scholarshipFacultyComment,
          scholarshipChairComment: r.scholarshipChairComment,
          scholarshipChairNarrative: r.scholarshipChairNarrative,
          scholarshipRating: r.scholarshipRating,
          researchOfficeScore: r.researchOfficeScore,
          researchOfficeNotes: r.researchOfficeNotes,
          serviceWeight: 20,
          serviceGoal: r.serviceGoal,
          serviceTarget: r.serviceGoal,
          serviceOutcome: r.serviceRating === "MEETS_EXPECTATIONS" ? "Meet Expectations" : r.serviceRating === "EXCEEDS_EXPECTATIONS" ? "Exceeds Expectations" : "Does Not Meet Expectations",
          serviceFacultyComment: r.serviceFacultyComment,
          serviceChairComment: r.serviceChairComment,
          serviceChairNarrative: r.serviceChairNarrative,
          serviceRating: r.serviceRating,
          collegialityRating: r.collegialityRating,
          collegialityChairComment: r.collegialityChairComment,
          developmentComments: r.developmentComments,
          nextTeachingGoal: r.nextTeachingGoal,
          nextTeachingTarget: r.nextTeachingGoal,
          nextScholarshipGoal: r.nextScholarshipGoal,
          nextScholarshipTarget: r.nextScholarshipGoal,
          nextServiceGoal: r.nextServiceGoal,
          nextServiceTarget: r.nextServiceGoal,
          overallRating: rating,
          overallWeightedScore: score,
        },
      });

      for (const appr of r.approvals) {
        await prisma.performanceReviewApproval.create({
          data: { reviewId: rev.id, activity: appr.activity, actorName: appr.actorName, outcome: appr.outcome, comments: appr.comments ?? null },
        });
      }
    }

    console.log(`  ✓ ${fac.fp.firstName} ${fac.fp.lastName} (${reqNo}) — ${r.status}`);
  }

  // ── Department / division assignments ─────────────────────────────────────
  await prisma.department.update({ where: { id: deptCIE.id }, data: { chairId: "user-chair-cie" } });
  await prisma.department.update({ where: { id: deptECE.id }, data: { chairId: "user-chair-ece" } });
  await prisma.division.update({ where: { id: divEng.id }, data: { deanId: "user-dean-eng" } });
  await prisma.division.update({ where: { id: divSci.id }, data: { deanId: "user-dean-sci" } });

  console.log("\n✅ Seed complete — 10 faculty with performance reviews!\n");
  console.log("📋 Test Credentials:");
  console.log("──────────────────────────────────────────────────────────────");
  console.log("PROVOST       provost@ku.ac.ae             Provost@123");
  console.log("HR ADMIN      hr.admin@ku.ac.ae            HRAdmin@123");
  console.log("DEAN (Eng)    dean.engineering@ku.ac.ae    Dean@Eng123");
  console.log("DEAN (Sci)    dean.sciences@ku.ac.ae       Dean@Sci123");
  console.log("CHAIR (CIE)   chair.cie@ku.ac.ae           Chair@CIE123");
  console.log("CHAIR (ECE)   chair.ece@ku.ac.ae           Chair@ECE123");
  console.log("COMMITTEE     review.committee@ku.ac.ae    Committee@123");
  console.log("Faculty       *@ku.ac.ae                   Faculty@123");
  console.log("──────────────────────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });