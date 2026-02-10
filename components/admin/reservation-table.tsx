"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReservationStatusBadge } from "@/components/shared/reservation-status-badge";
import { ReservationDetailsDialog } from "@/components/admin/reservation-details-dialog";
import { CancelReservationDialog } from "@/components/admin/cancel-reservation-dialog";
import { MoreHorizontal, Eye, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Reservation {
  id: string;
  reference_code: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
  public_spaces: {
    id: string;
    name: string;
  };
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ReservationTableProps {
  reservations: Reservation[];
}

export function ReservationTable({ reservations }: ReservationTableProps) {
  const t = useTranslations("admin.reservations.table");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleViewDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDetailsDialog(true);
  };

  const handleCancelReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowCancelDialog(true);
  };

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reference")}</TableHead>
              <TableHead>{t("space")}</TableHead>
              <TableHead>{t("resident")}</TableHead>
              <TableHead>{t("dateTime")}</TableHead>
              <TableHead>{t("amount")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="w-[70px]">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-mono text-sm">
                  {reservation.reference_code}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{reservation.public_spaces.name}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{reservation.profiles.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.profiles.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {format(new Date(reservation.start_time), "PP")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(reservation.start_time), "p")} -{" "}
                      {format(new Date(reservation.end_time), "p")}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">
                    ${reservation.total_amount.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <ReservationStatusBadge status={reservation.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t("openMenu")}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t("menuLabel")}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewDetails(reservation)}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t("viewDetails")}
                      </DropdownMenuItem>
                      {["pending_payment", "payment_submitted", "confirmed"].includes(
                        reservation.status
                      ) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCancelReservation(reservation)}
                            className="text-destructive focus:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {t("cancel")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      {selectedReservation && (
        <ReservationDetailsDialog
          reservation={selectedReservation}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
        />
      )}

      {/* Cancel Dialog */}
      {selectedReservation && (
        <CancelReservationDialog
          reservation={selectedReservation}
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
        />
      )}
    </>
  );
}
