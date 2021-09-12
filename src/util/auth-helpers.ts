import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import { AuthenticatedRequest } from "../plugins/types";

export async function isRequestedUserOrAdmin(request: AuthenticatedRequest, h: Hapi.ResponseToolkit) {
  const { userId, isAdmin } = request.auth.credentials

  if (isAdmin) return h.continue;

  const requestedUserId = parseInt(request.params.userId, 10)
  if (requestedUserId === userId) return h.continue;

  throw Boom.forbidden();
};

export async function isTeacherOfCourseOrAdmin(
  request: AuthenticatedRequest,
  h: Hapi.ResponseToolkit,
) {
  const { isAdmin, teacherOf } = request.auth.credentials

  if (isAdmin) return h.continue;

  const courseId = parseInt(request.params.courseId, 10)

  if (teacherOf && teacherOf.includes(courseId)) {
    return h.continue
  }

  throw Boom.forbidden()
};

