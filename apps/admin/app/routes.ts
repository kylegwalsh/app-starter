import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('login', 'routes/login.tsx'),
  layout('routes/dashboard.tsx', [
    route('dashboard', 'routes/dashboard/dashboard.index.tsx'),
    route('dashboard/users', 'routes/dashboard/users.index.tsx'),
    route('dashboard/users/new', 'routes/dashboard/users.new.tsx'),
    route('dashboard/users/:userId', 'routes/dashboard/users.$userId.tsx'),
  ]),
] satisfies RouteConfig;
