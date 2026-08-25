/**
 * DEV BYPASS - remove this file and revert imports when DB is ready.
 * Provides a fake PROVOST session so the dashboard is accessible without a database.
 */

export const DEV_BYPASS = process.env.NODE_ENV === "development";

export const mockSession = {
  user: {
    id: "mock-provost-id",
    name: "Dr. Eleanor Voss",
    email: "provost@westbrook.edu",
    role: "PROVOST",
    facultyProfileId: null,
  },
  expires: "2099-01-01T00:00:00.000Z",
};
