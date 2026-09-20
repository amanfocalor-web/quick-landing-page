import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home" },
      {
        name: "description",
        content: "A clean landing page, ready to be filled in.",
      },
      { property: "og:title", content: "Home" },
      {
        property: "og:description",
        content: "A clean landing page, ready to be filled in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Your landing page will live here.
        </p>
      </main>
    </div>
  );
}
