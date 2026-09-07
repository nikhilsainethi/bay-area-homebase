'use client';
import { useState } from 'react';
import { Plus, Trash2, MapPin, Save, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  HOME_TYPES,
  STATUSES,
  emptyUnit,
  monthlyTotal,
  type Property,
  type Unit,
} from '@/lib/domain';
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger aria-label={label} className="field-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export default function PropertyEditor({
  initial,
  onClose,
  onSave,
  onLocate,
}: {
  initial: Property;
  onClose: () => void;
  onSave: (p: Property) => Promise<void>;
  onLocate: (p: Property) => void;
}) {
  const [p, setP] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const change = (key: keyof Property, value: unknown) =>
    setP((v) => ({ ...v, [key]: value }));
  const unitChange = (id: string, key: keyof Unit, value: unknown) =>
    setP((v) => ({
      ...v,
      units: v.units.map((u) => (u.id === id ? { ...u, [key]: value } : u)),
    }));
  function field(
    label: string,
    key: keyof Property,
    type = 'text',
    wide = false,
  ) {
    return (
      <label className={`field ${wide ? 'span-2' : ''}`} key={key}>
        <span>{label}</span>
        <Input
          type={type}
          value={
            typeof p[key] === 'string' || typeof p[key] === 'number'
              ? String(p[key])
              : ''
          }
          onChange={(e) =>
            change(
              key,
              type === 'number'
                ? e.target.value === ''
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          min={type === 'number' ? 0 : undefined}
          step={key === 'driveMiles' ? '0.1' : undefined}
          required={key === 'name'}
          maxLength={key === 'notes' ? 15000 : 2000}
        />
      </label>
    );
  }
  function uf(
    u: Unit,
    label: string,
    key: keyof Unit,
    type = 'text',
    wide = false,
  ) {
    return (
      <label className={`field ${wide ? 'span-2' : ''}`} key={key}>
        <span>{label}</span>
        <Input
          type={type}
          value={String(u[key] ?? '')}
          onChange={(e) =>
            unitChange(
              u.id,
              key,
              type === 'number'
                ? e.target.value === ''
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          min={type === 'number' ? 0 : undefined}
          step={key === 'baths' ? '0.5' : type === 'number' ? 'any' : undefined}
        />
      </label>
    );
  }
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(p);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not save. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="property-editor" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>
            {initial.updatedAt ? 'Edit property' : 'Add to your shortlist'}
          </DialogTitle>
          <DialogDescription>
            Keep each floor plan’s price and availability together. Leave
            unknown details blank.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="editor-scroll">
            <fieldset disabled={busy}>
              <div className="form-grid">
                {field('Property name *', 'name')}
                {field('City', 'city')}{' '}
                {field('Address', 'address', 'text', true)}
                <Choice
                  label="Home type"
                  value={p.homeType}
                  options={HOME_TYPES}
                  onChange={(v) => change('homeType', v)}
                />
                <Choice
                  label="Search progress"
                  value={p.status}
                  options={STATUSES}
                  onChange={(v) => change('status', v)}
                />
                {field('Property website', 'website')}
                {field('Listing link', 'listingUrl')}
                <div className="location-row span-2">
                  <MapPin size={17} />
                  <span>
                    {p.lat !== null
                      ? `Pin placed · ${p.lat.toFixed(5)}, ${p.lng?.toFixed(5)}`
                      : 'No map pin yet'}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onLocate(p)}
                  >
                    {p.lat !== null ? 'Move pin' : 'Place on map'}
                  </Button>
                </div>
              </div>
              <h3 className="form-section">Leasing contact</h3>
              <div className="form-grid">
                {field('Contact name', 'contactName')}
                {field('Phone', 'phone', 'tel')}
                {field('Email', 'email', 'email')}
                {field('Last verified', 'verifiedDate', 'date')}
              </div>
              <div className="section-heading">
                <h3>Units & floor plans</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => change('units', [...p.units, emptyUnit()])}
                >
                  <Plus />
                  Add floor plan
                </Button>
              </div>
              {p.units.length === 0 && (
                <p className="form-help">
                  Add a floor plan when you find pricing or availability.
                </p>
              )}
              {p.units.map((u, i) => (
                <section className="unit-editor" key={u.id}>
                  <div className="section-heading">
                    <strong>Floor plan {i + 1}</strong>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove floor plan ${i + 1}`}
                      onClick={() =>
                        change(
                          'units',
                          p.units.filter((x) => x.id !== u.id),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="form-grid">
                    {uf(u, 'Unit / floor plan name', 'label')}
                    {uf(u, 'Available date', 'availableDate', 'date')}
                    {uf(u, 'Bedrooms (0 = studio)', 'beds', 'number')}
                    {uf(u, 'Bathrooms (e.g. 1.5)', 'baths', 'number')}
                    {uf(u, 'Base rent / month ($)', 'rent', 'number')}
                    {uf(u, 'Recurring fees / month ($)', 'fees', 'number')}
                    {uf(u, 'Deposit ($)', 'deposit', 'number')}
                    {uf(u, 'Total size (sq ft)', 'sqft', 'number')}
                    {uf(
                      u,
                      'Bedroom dimensions (e.g. 12 × 11 ft)',
                      'bedroomDimensions',
                      'text',
                      true,
                    )}
                    {uf(u, 'Lease length (months)', 'leaseMonths', 'number')}
                    {uf(u, 'Concessions / special offers', 'concessions')}
                  </div>
                  <p className="unit-total">
                    Known monthly total{' '}
                    <strong>
                      {monthlyTotal(u) === null
                        ? 'Not entered'
                        : `$${monthlyTotal(u)!.toLocaleString()}`}
                    </strong>
                    <small>
                      Base rent + entered recurring fees; concessions excluded.
                    </small>
                  </p>
                </section>
              ))}
              <h3 className="form-section">Commute research</h3>
              <p className="form-help">
                Optional: record a driving estimate from Google Maps. Note the
                departure time below.
              </p>
              <div className="form-grid">
                {field('Driving time (minutes)', 'driveMinutes', 'number')}
                {field('Driving distance (miles)', 'driveMiles', 'number')}
                <label className="field span-2" htmlFor="property-notes">
                  <span>Notes</span>
                  <Textarea
                    id="property-notes"
                    rows={4}
                    value={p.notes}
                    placeholder="Tour impressions, parking, commute at 8:30 am…"
                    onChange={(e) => change('notes', e.target.value)}
                    maxLength={15000}
                  />
                </label>
                <label
                  className="favorite-field span-2"
                  htmlFor="property-favorite"
                >
                  <Checkbox
                    id="property-favorite"
                    checked={p.favorite}
                    onCheckedChange={(v) => change('favorite', v)}
                  />
                  <Star size={16} />
                  Mark as a favorite
                </label>
              </div>
            </fieldset>
          </div>
          <footer className="editor-footer">
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Save />
              {busy ? 'Saving…' : 'Save property'}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
