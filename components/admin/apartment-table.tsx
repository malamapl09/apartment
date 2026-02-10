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
import { ApartmentWithOwners } from "@/types";
import { Pencil } from "lucide-react";
import { useParams } from "next/navigation";

interface ApartmentTableProps {
  apartments: ApartmentWithOwners[];
}

export function ApartmentTable({ apartments }: ApartmentTableProps) {
  const params = useParams();
  const locale = params.locale as string;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "occupied":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "vacant":
        return <Badge variant="secondary">{status}</Badge>;
      case "maintenance":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit</TableHead>
            <TableHead>Floor</TableHead>
            <TableHead>Area (m²)</TableHead>
            <TableHead>Bedrooms</TableHead>
            <TableHead>Bathrooms</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owners</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apartments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No apartments found
              </TableCell>
            </TableRow>
          ) : (
            apartments.map((apartment) => (
              <TableRow key={apartment.id}>
                <TableCell className="font-medium">
                  {apartment.unit_number}
                </TableCell>
                <TableCell>{apartment.floor}</TableCell>
                <TableCell>{apartment.area_sqm}</TableCell>
                <TableCell>{apartment.bedrooms}</TableCell>
                <TableCell>{apartment.bathrooms}</TableCell>
                <TableCell>{getStatusBadge(apartment.status)}</TableCell>
                <TableCell>
                  {apartment.apartment_owners && apartment.apartment_owners.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {apartment.apartment_owners.map((ao: any) => (
                        <span key={ao.id} className="text-sm">
                          {ao.profiles?.full_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      No owners
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/${locale}/admin/apartments/${apartment.id}`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-4 w-4" />
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
