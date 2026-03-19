import { HttpInterceptorFn } from '@angular/common/http';

const JWT_KEY     = 'interview_admin_token';
const SESSION_KEY = 'interview_session_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const jwt          = sessionStorage.getItem(JWT_KEY);
  const sessionToken = sessionStorage.getItem(SESSION_KEY);

  let headers = req.headers;
  if (jwt)          headers = headers.set('Authorization', `Bearer ${jwt}`);
  if (sessionToken) headers = headers.set('x-session-token', sessionToken);

  return next(headers === req.headers ? req : req.clone({ headers }));
};
