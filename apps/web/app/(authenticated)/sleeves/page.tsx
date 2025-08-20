'use client';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/design';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import * as React from 'react';

import { Header } from '@/components';
import { DashboardLayout } from '@/components';

// ----- Types -----

type Custodian = 'Fidelity' | 'Schwab' | 'Vanguard';

type Holding = {
  id: string;
  symbol: string;
  name: string;
  allocationPct: number; // 0-100
};

type SleeveGroup = {
  id: string;
  groupName: string;
  custodian: Custodian;
  holdings: Holding[];
  archived: boolean;
};

type Sleeve = {
  id: string;
  sleeveName: string;
  groups: SleeveGroup[];
  archived: boolean;
};

type SleeveGroupTemplate = {
  id: string;
  groupName: string;
  defaultCustodian: Custodian;
  defaultHoldings: Holding[];
};

// ----- Dummy data -----

const INITIAL_DATA: Sleeve[] = [
  {
    id: 's1',
    sleeveName: 'Long term growth',
    archived: false,
    groups: [
      {
        id: 's1-g1',
        groupName: 'Blue Chip Blend',
        custodian: 'Fidelity',
        holdings: [
          { id: 'h1', symbol: 'AAPL', name: 'Apple Inc.', allocationPct: 25 },
          { id: 'h2', symbol: 'MSFT', name: 'Microsoft Corp.', allocationPct: 25 },
          { id: 'h3', symbol: 'NVDA', name: 'NVIDIA Corp.', allocationPct: 25 },
          { id: 'h4', symbol: 'GOOGL', name: 'Alphabet Inc.', allocationPct: 25 },
        ],
        archived: false,
      },
      {
        id: 's1-g2',
        groupName: 'Dividend Aristocrats',
        custodian: 'Schwab',
        holdings: [
          { id: 'h5', symbol: 'PG', name: 'Procter & Gamble', allocationPct: 30 },
          { id: 'h6', symbol: 'KO', name: 'Coca-Cola', allocationPct: 30 },
          { id: 'h7', symbol: 'JNJ', name: 'Johnson & Johnson', allocationPct: 40 },
        ],
        archived: false,
      },
    ],
  },
  {
    id: 's2',
    sleeveName: 'Short term growth',
    archived: false,
    groups: [
      {
        id: 's2-g1',
        groupName: 'Tech Momentum',
        custodian: 'Vanguard',
        holdings: [
          { id: 'h8', symbol: 'AMD', name: 'Advanced Micro Devices', allocationPct: 40 },
          { id: 'h9', symbol: 'META', name: 'Meta Platforms', allocationPct: 30 },
          { id: 'h10', symbol: 'CRM', name: 'Salesforce', allocationPct: 30 },
        ],
        archived: false,
      },
      {
        id: 's2-g2',
        groupName: 'Small Cap Mix',
        custodian: 'Fidelity',
        holdings: [
          { id: 'h11', symbol: 'IWM', name: 'iShares Russell 2000 ETF', allocationPct: 60 },
          { id: 'h12', symbol: 'VTWO', name: 'Vanguard Russell 2000 ETF', allocationPct: 40 },
        ],
        archived: false,
      },
    ],
  },
];

const CUSTODIANS: Custodian[] = ['Fidelity', 'Schwab', 'Vanguard'];

// ----- Utils -----

function sumPercent(holdings: Holding[]) {
  return holdings.reduce((s, h) => s + (Number.isFinite(h.allocationPct) ? h.allocationPct : 0), 0);
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function chooseDefaultCustodianWithData(currentData: Sleeve[]): Custodian {
  for (const c of CUSTODIANS) {
    for (const s of currentData) {
      if (s.groups.some((g) => g.custodian === c && g.holdings.length > 0)) {
        return c;
      }
    }
  }
  return CUSTODIANS[0];
}

// ----- Page -----

export default function Page() {
  const [data, setData] = React.useState<Sleeve[]>(INITIAL_DATA);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = React.useState(false);

  // Group library derived from initial data (deduped by groupName)
  const [groupLibrary, setGroupLibrary] = React.useState<SleeveGroupTemplate[]>(() => {
    const seen = new Set<string>();
    const out: SleeveGroupTemplate[] = [];
    for (const s of INITIAL_DATA) {
      for (const g of s.groups) {
        if (seen.has(g.groupName)) continue;
        seen.add(g.groupName);
        out.push({
          id: generateId('tmpl'),
          groupName: g.groupName,
          defaultCustodian: g.custodian,
          defaultHoldings: g.holdings.map((h) => ({ ...h })),
        });
      }
    }
    return out;
  });

  // Sheet
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [activeGroup, setActiveGroup] = React.useState<{
    sleeveId: string;
    groupId: string;
  } | null>(null);
  const [editCustodian, setEditCustodian] = React.useState<Custodian | null>(null);
  const [editHoldings, setEditHoldings] = React.useState<Holding[]>([]);

  // Add dialog
  const [addOpen, setAddOpen] = React.useState(false);
  const [addingSleeveId, setAddingSleeveId] = React.useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>('');
  const [newGroupName, setNewGroupName] = React.useState<string>('');
  // No custodian selection in modal; we'll default later
  // Add sleeve dialog
  const [addSleeveOpen, setAddSleeveOpen] = React.useState(false);
  const [newSleeveName, setNewSleeveName] = React.useState<string>('');
  const [confirmArchiveOpen, setConfirmArchiveOpen] = React.useState(false);
  const [pendingArchive, setPendingArchive] = React.useState<{
    sleeveId: string;
    groupId: string;
  } | null>(null);
  const [confirmArchiveSleeveOpen, setConfirmArchiveSleeveOpen] = React.useState(false);
  const [pendingArchiveSleeve, setPendingArchiveSleeve] = React.useState<string | null>(null);

  function toggleSleeve(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  function openGroup(sleeveId: string, groupId: string) {
    const sleeve = data.find((s) => s.id === sleeveId);
    const group = sleeve?.groups.find((g) => g.id === groupId);
    if (!sleeve || !group) return;

    setActiveGroup({ sleeveId, groupId });
    setEditCustodian(group.custodian);
    setEditHoldings(group.holdings.map((h) => ({ ...h })));
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setActiveGroup(null);
    setEditCustodian(null);
    setEditHoldings([]);
  }

  function updateHolding(id: string, next: Partial<Holding>) {
    setEditHoldings((rows) => rows.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }

  function addHolding() {
    const n = editHoldings.length + 1;
    setEditHoldings((rows) => [
      ...rows,
      { id: `new-${Date.now()}`, symbol: 'TICK', name: `New Holding ${n}`, allocationPct: 0 },
    ]);
  }

  function removeHolding(id: string) {
    setEditHoldings((rows) => rows.filter((r) => r.id !== id));
  }

  function saveGroup() {
    if (!activeGroup || !editCustodian) return;
    setData((prev) =>
      prev.map((s) => {
        if (s.id !== activeGroup.sleeveId) return s;
        return {
          ...s,
          groups: s.groups.map((g) =>
            g.id === activeGroup.groupId
              ? { ...g, custodian: editCustodian, holdings: editHoldings }
              : g
          ),
        };
      })
    );
    closeSheet();
  }

  function setGroupArchived(sleeveId: string, groupId: string, archived: boolean) {
    setData((prev) =>
      prev.map((s) =>
        s.id === sleeveId
          ? {
              ...s,
              groups: s.groups.map((g) => (g.id === groupId ? { ...g, archived } : g)),
            }
          : s
      )
    );
    if (archived && !showArchived) {
      closeSheet();
    }
  }

  function setSleeveArchived(sleeveId: string, archived: boolean) {
    setData((prev) => prev.map((s) => (s.id === sleeveId ? { ...s, archived } : s)));
    if (archived && !showArchived && activeGroup && activeGroup.sleeveId === sleeveId) {
      closeSheet();
    }
  }

  // Add group flow
  function openAddDialog(sleeveId: string) {
    setAddingSleeveId(sleeveId);
    setSelectedTemplateId('');
    setNewGroupName('');
    setAddOpen(true);
  }

  function closeAddDialog() {
    setAddOpen(false);
    setAddingSleeveId(null);
  }

  const addingSleeve = addingSleeveId ? data.find((s) => s.id === addingSleeveId) : null;
  const existingNamesInSleeve = new Set((addingSleeve?.groups ?? []).map((g) => g.groupName));

  const isCreateNew = selectedTemplateId === 'new';
  const canSubmit =
    addingSleeve != null &&
    (isCreateNew
      ? !!newGroupName.trim() && !existingNamesInSleeve.has(newGroupName.trim())
      : !!selectedTemplateId);

  function handleAddSubmit() {
    if (!addingSleeve) return;
    if (isCreateNew) {
      const name = newGroupName.trim();
      if (!name || existingNamesInSleeve.has(name)) return;
      // Default custodian: first with data across the app; fallback to first in list
      const fallbackCustodian: Custodian = chooseDefaultCustodianWithData(data);
      const tmpl: SleeveGroupTemplate = {
        id: generateId('tmpl'),
        groupName: name,
        defaultCustodian: fallbackCustodian,
        defaultHoldings: [],
      };
      setGroupLibrary((lib) => [...lib, tmpl]);
      const newId = generateId('g');
      const newGroup: SleeveGroup = {
        id: newId,
        groupName: name,
        custodian: fallbackCustodian,
        holdings: [],
        archived: false,
      };
      setData((prev) =>
        prev.map((s) => (s.id === addingSleeve.id ? { ...s, groups: [...s.groups, newGroup] } : s))
      );
      setExpanded((e) => ({ ...e, [addingSleeve.id]: true }));
      setAddOpen(false);
      // Open the sheet for the new group immediately
      setActiveGroup({ sleeveId: addingSleeve.id, groupId: newId });
      setEditCustodian(newGroup.custodian);
      setEditHoldings(newGroup.holdings.map((h) => ({ ...h })));
      setSheetOpen(true);
    } else {
      const tmpl = groupLibrary.find((t) => t.id === selectedTemplateId);
      if (!tmpl || existingNamesInSleeve.has(tmpl.groupName)) return;
      const newId = generateId('g');
      const newGroup: SleeveGroup = {
        id: newId,
        groupName: tmpl.groupName,
        custodian: tmpl.defaultCustodian,
        holdings: tmpl.defaultHoldings.map((h) => ({ ...h })),
        archived: false,
      };
      setData((prev) =>
        prev.map((s) => (s.id === addingSleeve.id ? { ...s, groups: [...s.groups, newGroup] } : s))
      );
      setExpanded((e) => ({ ...e, [addingSleeve.id]: true }));
      setAddOpen(false);
      // Open the sheet for the new group immediately
      setActiveGroup({ sleeveId: addingSleeve.id, groupId: newId });
      setEditCustodian(newGroup.custodian);
      setEditHoldings(newGroup.holdings.map((h) => ({ ...h })));
      setSheetOpen(true);
    }
  }

  function openAddSleeveDialog() {
    setNewSleeveName('');
    setAddSleeveOpen(true);
  }

  function handleAddSleeveSubmit() {
    const name = newSleeveName.trim();
    if (!name) return;
    const exists = data.some((s) => s.sleeveName.toLowerCase() === name.toLowerCase());
    if (exists) return;
    const newId = generateId('s');
    const newSleeve: Sleeve = { id: newId, sleeveName: name, groups: [], archived: false };
    setData((prev) => [...prev, newSleeve]);
    setExpanded((prev) => ({ ...prev, [newId]: true }));
    setAddSleeveOpen(false);
  }

  const total = sumPercent(editHoldings);
  const isBalanced = Math.round(total) === 100;

  return (
    <>
      <Header breadcrumbs={[{ label: 'Sleeves', href: '/sleeves' }]} />

      <DashboardLayout
        title="Sleeves"
        description="Manage your sleeves and allocations"
        actions={
          <>
            <div className="mr-4 flex items-center gap-2">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} />
              <span className="text-muted-foreground text-sm">Show archived</span>
            </div>
            <Button onClick={openAddSleeveDialog}>
              <PlusIcon className="size-4" /> New sleeve
            </Button>
          </>
        }>
        <div className="rounded-md border">
          <Table>
            <TableBody>
              {(showArchived ? data : data.filter((s) => !s.archived)).map((sleeve) => {
                const isOpen = !!expanded[sleeve.id];
                return (
                  <React.Fragment key={sleeve.id}>
                    <TableRow className="bg-muted/40">
                      <TableCell className="p-0">
                        <div
                          className="flex w-full cursor-pointer items-center justify-between px-2 py-2"
                          onClick={() => toggleSleeve(sleeve.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') toggleSleeve(sleeve.id);
                          }}>
                          <div className="flex items-center gap-2">
                            {isOpen ? (
                              <ChevronDownIcon className="size-4" />
                            ) : (
                              <ChevronRightIcon className="size-4" />
                            )}
                            <span className="font-medium">{sleeve.sleeveName}</span>
                            <Badge variant="outline" className="ml-2">
                              {sleeve.groups.length} groups
                            </Badge>
                            {sleeve.archived && <Badge variant="outline">Archived</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            {sleeve.archived ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Unarchive sleeve"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSleeveArchived(sleeve.id, false);
                                    }}>
                                    <ArchiveRestoreIcon className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>Unarchive sleeve</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Archive sleeve"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPendingArchiveSleeve(sleeve.id);
                                      setConfirmArchiveSleeveOpen(true);
                                    }}>
                                    <ArchiveIcon className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>Archive sleeve</TooltipContent>
                              </Tooltip>
                            )}
                            {!sleeve.archived && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Add group"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAddDialog(sleeve.id);
                                    }}>
                                    <PlusIcon className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>Add group</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isOpen &&
                      (showArchived ? sleeve.groups : sleeve.groups.filter((g) => !g.archived)).map(
                        (g) => (
                          <TableRow
                            key={g.id}
                            className="cursor-pointer"
                            onClick={() => openGroup(sleeve.id, g.id)}>
                            <TableCell>
                              <div className="pl-6">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={
                                      g.archived ? 'text-muted-foreground' : 'text-foreground'
                                    }>
                                    {g.groupName}
                                  </span>
                                  {g.archived && <Badge variant="outline">Archived</Badge>}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {g.holdings.length} holdings • {sumPercent(g.holdings)}%
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Sheet open={sheetOpen} onOpenChange={(o) => (o ? undefined : closeSheet())}>
          <SheetContent side="right" className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>
                {activeGroup
                  ? data
                      .find((s) => s.id === activeGroup.sleeveId)
                      ?.groups.find((g) => g.id === activeGroup.groupId)?.groupName
                  : 'Group'}
              </SheetTitle>
              <SheetDescription>
                Configure custodian and holdings for this sleeve group.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4">
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground text-sm">Custodian</div>
                <Select
                  value={editCustodian ?? undefined}
                  onValueChange={(v) => setEditCustodian(v as Custodian)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select custodian" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTODIANS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border p-4">
                {editHoldings.length === 0 ? (
                  <div className="text-center">
                    <div className="text-muted-foreground mb-2 text-sm">
                      No holdings yet for this group.
                    </div>
                    <Button variant="outline" onClick={addHolding}>
                      <PlusIcon className="size-4" /> Add first holding
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Ticker</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[140px] text-right">Allocation %</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editHoldings.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell>
                            <Input
                              value={h.symbol}
                              onChange={(e) =>
                                updateHolding(h.id, { symbol: e.target.value.toUpperCase() })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={h.name}
                              onChange={(e) => updateHolding(h.id, { name: e.target.value })}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={h.allocationPct}
                              onChange={(e) =>
                                updateHolding(h.id, { allocationPct: Number(e.target.value) })
                              }
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              onClick={() => removeHolding(h.id)}
                              aria-label="Remove">
                              <Trash2Icon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {editHoldings.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={addHolding}>
                    <PlusIcon className="size-4" /> Add holding
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">Total:</span>
                    <span className="font-medium">{total}%</span>
                    {isBalanced ? (
                      <Badge variant="secondary">Balanced</Badge>
                    ) : (
                      <Badge variant="destructive">Must equal 100%</Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-border h-px w-full" />

              <div className="flex items-center gap-2">
                {activeGroup &&
                  (() => {
                    const s = data.find((d) => d.id === activeGroup.sleeveId);
                    const g = s?.groups.find((gg) => gg.id === activeGroup.groupId);
                    if (!g) return null;
                    return g.archived ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Unarchive group"
                            onClick={() =>
                              setGroupArchived(activeGroup.sleeveId, activeGroup.groupId, false)
                            }>
                            <ArchiveRestoreIcon className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>Unarchive group</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setPendingArchive({
                            sleeveId: activeGroup.sleeveId,
                            groupId: activeGroup.groupId,
                          });
                          setConfirmArchiveOpen(true);
                        }}>
                        Archive
                      </Button>
                    );
                  })()}
                <Button variant="outline" onClick={closeSheet}>
                  Cancel
                </Button>
                <div className="ml-auto" />
                <Button onClick={saveGroup} disabled={!isBalanced || !editCustodian}>
                  Save changes
                </Button>
              </div>
            </div>

            <SheetFooter />
          </SheetContent>
        </Sheet>

        <Dialog open={addOpen} onOpenChange={(o) => (o ? setAddOpen(true) : closeAddDialog())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add sleeve group</DialogTitle>
              <DialogDescription>
                Select an existing group or choose "Create new…" to add a new one. Duplicates in the
                same sleeve are not allowed.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(v) => {
                    setSelectedTemplateId(v);
                    if (v !== 'new') setNewGroupName('');
                  }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Create new…</SelectItem>
                    {groupLibrary.map((t) => {
                      const disabled = existingNamesInSleeve.has(t.groupName);
                      return (
                        <SelectItem key={t.id} value={t.id} disabled={disabled}>
                          {t.groupName}
                          {disabled ? ' (already in sleeve)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {isCreateNew && (
                <>
                  <div>
                    <Input
                      placeholder="e.g., International Growth"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      aria-invalid={existingNamesInSleeve.has(newGroupName.trim())}
                    />
                    {existingNamesInSleeve.has(newGroupName.trim()) && (
                      <div className="text-destructive mt-1 text-xs">
                        A group with this name already exists in the sleeve.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeAddDialog}>
                Cancel
              </Button>
              <Button onClick={handleAddSubmit} disabled={!canSubmit}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={addSleeveOpen}
          onOpenChange={(o) => (o ? setAddSleeveOpen(true) : setAddSleeveOpen(false))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New sleeve</DialogTitle>
              <DialogDescription>Enter a unique name for your sleeve.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div>
                <Input
                  placeholder="e.g., Long term growth"
                  value={newSleeveName}
                  onChange={(e) => setNewSleeveName(e.target.value)}
                  aria-invalid={
                    newSleeveName.trim().length > 0 &&
                    data.some(
                      (s) => s.sleeveName.toLowerCase() === newSleeveName.trim().toLowerCase()
                    )
                  }
                />
                {newSleeveName.trim().length > 0 &&
                  data.some(
                    (s) => s.sleeveName.toLowerCase() === newSleeveName.trim().toLowerCase()
                  ) && (
                    <div className="text-destructive mt-1 text-xs">
                      A sleeve with this name already exists.
                    </div>
                  )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddSleeveOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSleeveSubmit}
                disabled={
                  newSleeveName.trim().length === 0 ||
                  data.some(
                    (s) => s.sleeveName.toLowerCase() === newSleeveName.trim().toLowerCase()
                  )
                }>
                Create sleeve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={confirmArchiveOpen}
          onOpenChange={(o) => (o ? setConfirmArchiveOpen(true) : setConfirmArchiveOpen(false))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive sleeve group</DialogTitle>
              <DialogDescription>
                Are you sure you want to archive this sleeve group? You can view archived groups by
                enabling "Show archived".
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmArchiveOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingArchive) {
                    setConfirmArchiveOpen(false);
                    setGroupArchived(pendingArchive.sleeveId, pendingArchive.groupId, true);
                    setPendingArchive(null);
                  }
                }}>
                Archive group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={confirmArchiveSleeveOpen}
          onOpenChange={(o) =>
            o ? setConfirmArchiveSleeveOpen(true) : setConfirmArchiveSleeveOpen(false)
          }>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive sleeve</DialogTitle>
              <DialogDescription>
                Are you sure you want to archive this sleeve? You can show archived sleeves using
                the toggle above.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmArchiveSleeveOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingArchiveSleeve) {
                    setConfirmArchiveSleeveOpen(false);
                    setSleeveArchived(pendingArchiveSleeve, true);
                    setPendingArchiveSleeve(null);
                  }
                }}>
                Archive sleeve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </>
  );
}
