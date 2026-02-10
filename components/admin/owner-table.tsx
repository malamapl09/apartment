"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Profile } from "@/types";
import { Eye } from "lucide-react";
import { useParams } from "next/navigation";

interface OwnerWithApartments extends Profile {
  apartments?: Array<{
    id: string;
    unit_number: string;
  }>;
}

interface OwnerTableProps {
  owners: OwnerWithApartments[];
}

export function OwnerTable({ owners }: OwnerTableProps) {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Apartments</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {owners.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No owners found
              </TableCell>
            </TableRow>
          ) : (
            owners.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell className="font-medium">
                  {owner.full_name || "N/A"}
                </TableCell>
                <TableCell>{owner.email}</TableCell>
                <TableCell>{owner.phone || "N/A"}</TableCell>
                <TableCell>
                  {owner.apartments && owner.apartments.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {owner.apartments.map((apt) => (
                        <Badge key={apt.id} variant="outline">
                          {apt.unit_number}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      No apartments
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={owner.is_active ? "default" : "secondary"}>
                    {owner.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/${locale}/admin/owners/${owner.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
