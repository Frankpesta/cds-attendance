"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2 } from "lucide-react";

export default function DocumentationLandingPage() {
  const tiles = [
    {
      title: "Corps Members",
      description: "Create registration links, review submissions, and manage medical files.",
      href: "/documentation/corp-members",
      icon: Users,
      cta: "Open Corps Desk",
    },
    {
      title: "Employers",
      description: "Collect employer documentation and manage yearly CMS requirements.",
      href: "/documentation/employers",
      icon: Building2,
      cta: "Open Employers Desk",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentation Hub</h1>
        <p className="text-muted-foreground">
          Generate registration links for corp members and employers, then manage their submissions in one place.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tiles.map((tile) => (
          <Card key={tile.href} className="border border-primary/10 shadow-lg">
            <CardHeader className="space-y-3">
              <div className="inline-flex rounded-full bg-primary/10 p-3 text-primary">
                <tile.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{tile.title}</h2>
                <p className="text-sm text-muted-foreground">{tile.description}</p>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={tile.href}>
                <Button className="w-full" variant="primary">
                  {tile.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
