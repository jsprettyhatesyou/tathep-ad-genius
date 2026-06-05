import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for Brand Activations — renders the list (index) or a single
// activation ($id) via <Outlet/>. Keeping this a passthrough lets /campaigns/$id
// render on its own instead of nesting under the list.
export const Route = createFileRoute("/_app/campaigns")({
  component: () => <Outlet />,
});
