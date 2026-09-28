"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClientForm, type ClientFormValues } from "./client-form";

export function NewClientButton({ staff }: { staff: { id: string; name: string }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(sp.get("new") === "1");
  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v && sp.get("new")) router.replace(pathname);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New client
        </Button>
      </DialogTrigger>
      <DialogContent title="New client" description="Add a lead or client. You can create their project right after." size="lg">
        <ClientForm staff={staff} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditClientButton({ staff, values }: { staff: { id: string; name: string }[]; values: ClientFormValues }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent title={`Edit ${values.companyName}`} size="lg">
        <ClientForm staff={staff} values={values} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
