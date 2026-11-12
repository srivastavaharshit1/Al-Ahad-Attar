import { NavLink } from 'react-router-dom';

const sections = [
  { to: '/admin/billing', label: 'New POS sale', end: true },
  { to: '/admin/billing/sales', label: 'POS sales' },
  { to: '/admin/billing/invoices', label: 'Invoices' },
  { to: '/admin/billing/reports', label: 'Reports' },
];

export function BillingSectionNav() {
  return <nav aria-label="Billing navigation" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
    {sections.map(section => <NavLink key={section.to} to={section.to} end={section.end}
      className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-amber-800 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
      {section.label}
    </NavLink>)}
  </nav>;
}
