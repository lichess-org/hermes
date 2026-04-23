import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/templates", "routes/api.templates.tsx"),
  route("api/templates/:key", "routes/api.templates.$key.tsx"),
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("admin", "routes/admin.tsx", [
    index("routes/admin._index.tsx"),
    route("templates/:templateId", "routes/admin.templates.$templateId.tsx"),
  ]),
] satisfies RouteConfig;
