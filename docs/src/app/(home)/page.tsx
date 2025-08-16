import { Button } from "@/components/button";
import { Install } from "@/components/install";
import { ReleaseButton } from "@/components/magic/release-button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container mx-auto py-16 grid grid-cols-2 gap-6">
      <div>
        <ReleaseButton className="mb-6">
          Introducing Sidekit alpha
        </ReleaseButton>
        <div className="mb-8">
          <h1 className="text-6xl font-black">Sidekit</h1>
          <p className="text-4xl">Your AI coding agent toolkit</p>
          <p className="text-gray-400">
            Sidekit is a CLI tool that boost your coding agent.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="lg" asChild>
            <Link href="/docs/sidekit">
              Get started <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs/registry">Registry</Link>
          </Button>
        </div>
      </div>
      <div>
        <Install />
      </div>
    </main>
  );
}
