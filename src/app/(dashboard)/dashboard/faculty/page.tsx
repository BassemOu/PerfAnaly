import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { DEV_BYPASS } from "@/lib/mock-session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, Filter } from "lucide-react";
import { RANK_LABELS } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

export default async function FacultyListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; rank?: string; department?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 20;

  type FacultyWithIncludes = Awaited<ReturnType<typeof prisma.facultyProfile.findMany<{
    include: { department: { select: { name: true; code: true } }; division: { select: { name: true } }; _count: { select: { appraisals: true; publications: true } } };
  }>>>[number];

  let faculty: FacultyWithIncludes[] = [];
  let total = 0;
  try { [faculty, total] = await Promise.all([
    prisma.facultyProfile.findMany({
      where: {
        OR: search
          ? [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { employeeId: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
        rank: params.rank ? (params.rank as never) : undefined,
        departmentId: params.department ?? undefined,
      },
      include: {
        department: { select: { name: true, code: true } },
        division: { select: { name: true } },
        _count: {
          select: { appraisals: true, publications: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facultyProfile.count({
      where: {
        OR: search
          ? [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { employeeId: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
    }),
  ]); } catch { /* DB not ready */ }

  void DEV_BYPASS; // suppress unused import warning
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty</h1>
          <p className="text-gray-500">{total} faculty members</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
          <Link href="/dashboard/admin/users/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Faculty
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="Search by name or employee ID..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {/* Faculty Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {faculty.map((f) => {
          const initials = getInitials(f.firstName, f.lastName);
          return (
            <Link key={f.id} href={`/dashboard/faculty/${f.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={f.profileImageUrl ?? ""} />
                      <AvatarFallback className="bg-indigo-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {f.title} {f.firstName} {f.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {RANK_LABELS[f.rank]}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {f.department.name}
                      </p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {f.employmentType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {f._count.appraisals} appraisals
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`?search=${search}&page=${p}`}>{p}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
