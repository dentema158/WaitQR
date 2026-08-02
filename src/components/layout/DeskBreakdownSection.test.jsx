import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { DeskBreakdownSection } from "./DeskBreakdownSection";

const theme = {
  accentColor: "#2563eb",
  bgColor: "#ffffff",
  fontColor: "#111827",
  borderColor: "#e5e7eb",
  radius: 8,
};

test("uses active theme colors for counter rail tickets and popup", () => {
  render(
    <div style={{ "--surface-bg": theme.bgColor }}>
      <DeskBreakdownSection
        embedded
        theme={theme}
        desks={[{ id: "desk-1", name: "Counter 1", services: ["hair"], status: "Available" }]}
        members={[
          { id: "member-1", name: "Ripa", deskIds: ["desk-1"] },
          { id: "member-2", name: "Sumi", deskIds: ["desk-1"] },
        ]}
        deskWord="Counter"
        deskWordPluralLower="counters"
        servedByDesk={{}}
        absentByDesk={{}}
        removedByDesk={{}}
        waitingByDesk={{ "desk-1": 1 }}
        sortedQueue={[{ id: "ticket-1", label: "A001", name: "Jane", serviceId: "hair", deskId: "desk-1", createdAt: 1_000 }]}
        sortedServed={[]}
        absentList={[]}
        removedLog={[]}
        serviceName={() => "Hair Cut"}
        now={10_000}
        getDeskPath={() => "/counters/counter-1"}
      />
    </div>,
  );

  expect(screen.getByLabelText("Open")).toBeInTheDocument();
  expect(screen.getByText("Ripa & Sumi")).toBeInTheDocument();
  const ticket = screen.getByRole("button", { name: /A001/i });
  expect(ticket).toHaveStyle({ background: theme.accentColor, color: "#ffffff" });
  expect(screen.getByText("next up")).toBeInTheDocument();

  fireEvent.click(ticket);

  expect(screen.getByText("A001 · Jane")).toHaveStyle({ color: theme.fontColor });
  expect(screen.getByText("Customer: Jane")).toHaveStyle({ borderColor: theme.borderColor });
});

test("separates receptionists from staff in counter card member labels", () => {
  const baseProps = {
    embedded: true,
    theme,
    desks: [
      { id: "desk-1", name: "Counter 1", services: ["hair"], status: "Available" },
      { id: "desk-2", name: "Counter 2", services: ["hair"], status: "Available" },
    ],
    members: [
      { id: "member-1", name: "Ripa", role: "Member", deskIds: ["desk-1", "desk-2"] },
      { id: "member-2", name: "Sumi", role: "Member", deskIds: ["desk-2"] },
      { id: "member-3", name: "Anika", role: "Receptionist", deskIds: ["desk-1", "desk-2"] },
    ],
    deskWord: "Counter",
    deskWordPluralLower: "counters",
    servedByDesk: {},
    absentByDesk: {},
    removedByDesk: {},
    waitingByDesk: {},
    sortedQueue: [],
    sortedServed: [],
    absentList: [],
    removedLog: [],
    serviceName: () => "Hair Cut",
    now: 10_000,
    getDeskPath: (desk) => `/counters/${desk.id}`,
  };

  render(
    <div style={{ "--surface-bg": theme.bgColor }}>
      <DeskBreakdownSection {...baseProps} />
    </div>,
  );

  expect(screen.getByText("Ripa & 1 receptionist")).toBeInTheDocument();
  expect(screen.getByText("2 Staff & 1 receptionist")).toBeInTheDocument();
});

test("shows up to six assigned avatars on counter cards", () => {
  render(
    <div style={{ "--surface-bg": theme.bgColor }}>
      <DeskBreakdownSection
        embedded
        theme={theme}
        desks={[{ id: "desk-1", name: "Counter 1", services: ["hair"], status: "Available" }]}
        members={[
          { id: "member-1", name: "Asha One", role: "Member", deskIds: ["desk-1"] },
          { id: "member-2", name: "Bina Two", role: "Member", deskIds: ["desk-1"] },
          { id: "member-3", name: "Chaya Three", role: "Member", deskIds: ["desk-1"] },
          { id: "member-4", name: "Dipa Four", role: "Member", deskIds: ["desk-1"] },
          { id: "member-5", name: "Esha Five", role: "Member", deskIds: ["desk-1"] },
          { id: "member-6", name: "Farah Six", role: "Member", deskIds: ["desk-1"] },
          { id: "member-7", name: "Gita Seven", role: "Receptionist", deskIds: ["desk-1"] },
        ]}
        deskWord="Counter"
        deskWordPluralLower="counters"
        servedByDesk={{}}
        absentByDesk={{}}
        removedByDesk={{}}
        waitingByDesk={{}}
        sortedQueue={[]}
        sortedServed={[]}
        absentList={[]}
        removedLog={[]}
        serviceName={() => "Hair Cut"}
        now={10_000}
        getDeskPath={() => "/counters/counter-1"}
      />
    </div>,
  );

  expect(screen.getAllByText(/^[A-Z][A-Z]$/)).toHaveLength(6);
  expect(screen.queryByText("GS")).not.toBeInTheDocument();
});

test("shows one all-filter rail target using next up, absent, then served priority", () => {
  const renderSection = ({ waitingTickets = [], servedTickets = [], absentTickets = [] }) => (
    <div style={{ "--surface-bg": theme.bgColor }}>
      <DeskBreakdownSection
        embedded
        theme={theme}
        desks={[{ id: "desk-1", name: "Counter 1", services: ["hair"], status: "Available" }]}
        members={[]}
        deskWord="Counter"
        deskWordPluralLower="counters"
        servedByDesk={{ "desk-1": servedTickets.length }}
        absentByDesk={{ "desk-1": absentTickets.length }}
        removedByDesk={{}}
        waitingByDesk={{ "desk-1": waitingTickets.length }}
        sortedQueue={waitingTickets}
        sortedServed={servedTickets}
        absentList={absentTickets}
        removedLog={[]}
        serviceName={() => "Hair Cut"}
        now={10_000}
        getDeskPath={() => "/counters/counter-1"}
      />
    </div>
  );
  const waitingTickets = [
    { id: "ticket-1", label: "A001", name: "Jane", serviceId: "hair", deskId: "desk-1", createdAt: 1_000 },
    { id: "ticket-2", label: "A002", name: "Mina", serviceId: "hair", deskId: "desk-1", createdAt: 2_000 },
  ];
  const servedTickets = [{ id: "served-1", label: "A000", name: "Nila", serviceId: "hair", deskId: "desk-1", createdAt: 500, completedAt: 7_000 }];
  const absentTickets = [{ id: "absent-1", label: "A099", name: "Rina", serviceId: "hair", skippedFromDesk: "desk-1", createdAt: 800, skippedAt: 8_000 }];

  const { rerender } = render(renderSection({ waitingTickets, servedTickets, absentTickets }));

  expect(screen.getByLabelText("Show Counter 1 tickets from start")).toBeInTheDocument();
  expect(screen.getByLabelText("Show Counter 1 tickets from end")).toBeInTheDocument();
  expect(screen.queryByLabelText("Show Counter 1 next up position")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Show Counter 1 absent tickets")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Show Counter 1 served tickets")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /all/i }));

  expect(screen.getByLabelText("Show Counter 1 next up position")).toBeInTheDocument();
  expect(screen.queryByLabelText("Show Counter 1 absent tickets")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Show Counter 1 served tickets")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Show Counter 1 next up position"));

  rerender(renderSection({ servedTickets, absentTickets }));

  expect(screen.queryByLabelText("Show Counter 1 next up position")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Show Counter 1 absent tickets")).toBeInTheDocument();
  expect(screen.queryByLabelText("Show Counter 1 served tickets")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Show Counter 1 absent tickets"));

  rerender(renderSection({ servedTickets }));

  expect(screen.queryByLabelText("Show Counter 1 next up position")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Show Counter 1 absent tickets")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Show Counter 1 served tickets")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Show Counter 1 served tickets"));
});
