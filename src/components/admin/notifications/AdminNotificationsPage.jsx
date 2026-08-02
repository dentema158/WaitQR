import { useState } from "react";
import { Bell } from "lucide-react";
import { Field, SectionCard, Toggle } from "../settings/AdminSettingsContent";

const DEFAULT_NOTIFICATION_SETTINGS = {
  soundAlert: true,
  whatsapp: false,
  emailNotif: true,
};

export function AdminNotificationsPage({ theme }) {
  const { accentColor, fontColor, borderColor, radius } = theme;
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const set = (key) => (value) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4 px-2.5 py-2.5 sm:space-y-6 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
      <SectionCard
        icon={Bell}
        iconBg={accentColor}
        title="Notifications Settings"
        fontColor={fontColor}
        borderColor={borderColor}
        radius={radius}
      >
        <Field label="Sound Alert" hint="Play sound when next ticket is called" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={settings.soundAlert} onChange={set("soundAlert")} accent={accentColor} />
          </div>
        </Field>
        <Field label="WhatsApp Notifications" hint="Send WhatsApp alerts to assigned members" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={settings.whatsapp} onChange={set("whatsapp")} accent={accentColor} />
          </div>
        </Field>
        <Field label="Email Notifications" hint="Send email notifications for important events" inline fontColor={fontColor}>
          <div className="flex justify-end">
            <Toggle checked={settings.emailNotif} onChange={set("emailNotif")} accent={accentColor} />
          </div>
        </Field>
      </SectionCard>
    </div>
  );
}
