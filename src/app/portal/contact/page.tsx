import { Mail, MessageCircle, Phone } from "lucide-react";
import { requireClientPage } from "@/server/auth/session";
import { getPortalContext } from "@/server/services/portal";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/layout";
import { ContactForm } from "@/components/portal/contact-form";

export const metadata = { title: "Contact RQdinn" };

export default async function PortalContact() {
  const user = await requireClientPage();
  const ctx = await getPortalContext(user);
  const a = ctx.agency;
  return (
    <div className="animate-fade-in">
      <PageHeader title="Contact RQdinn" description="We're here to help. Reach us however suits you." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          {ctx.pm && (
            <Card className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Your project manager</p>
              <div className="flex items-center gap-3">
                <Avatar name={ctx.pm.name} size="lg" />
                <div>
                  <p className="font-medium">{ctx.pm.name}</p>
                  <p className="text-sm text-muted">{ctx.pm.email}</p>
                </div>
              </div>
            </Card>
          )}
          <Card className="space-y-2 p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{a.name}</p>
            {a.whatsapp && (
              <Button variant="success" size="lg" className="w-full justify-start" asChild>
                <a href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  <MessageCircle /> WhatsApp us
                </a>
              </Button>
            )}
            {a.phone && (
              <Button variant="secondary" size="lg" className="w-full justify-start" asChild>
                <a href={`tel:${a.phone.replace(/\s/g, "")}`}>
                  <Phone /> {a.phone}
                </a>
              </Button>
            )}
            {a.email && (
              <Button variant="secondary" size="lg" className="w-full justify-start" asChild>
                <a href={`mailto:${a.email}`}>
                  <Mail /> {a.email}
                </a>
              </Button>
            )}
          </Card>
        </div>
        {ctx.project && (
          <Card>
            <CardHeader title="Send a message" description="Your message goes straight to the RQdinn team." />
            <div className="p-5">
              <ContactForm projectId={ctx.project.project.id} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
