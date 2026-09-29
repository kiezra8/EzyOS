import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Palette, Save } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button, Card, Input, Select } from '../ui';

const SettingsPage: React.FC = () => {
  const { profile, updateProfile } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    business_name: profile?.business_name ?? '',
    business_type: profile?.business_type ?? 'hybrid',
    currency: profile?.currency ?? 'USD',
    tax_rate: profile?.tax_rate?.toString() ?? '0',
    address: profile?.address ?? '',
    phone: profile?.phone ?? '',
    email: profile?.email ?? '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        business_name: form.business_name,
        business_type: form.business_type as 'retail' | 'wholesale' | 'hybrid',
        currency: form.currency,
        tax_rate: parseFloat(form.tax_rate) || 0,
        address: form.address,
        phone: form.phone,
        email: form.email,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Configure your business profile</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">Business Profile</h2>
        </div>
        <Input label="Business Name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        <Select
          label="Business Type"
          value={form.business_type}
          onChange={(e) => setForm({ ...form, business_type: e.target.value })}
          options={[
            { value: 'retail', label: 'Retail' },
            { value: 'wholesale', label: 'Wholesale' },
            { value: 'hybrid', label: 'Hybrid (Retail + Wholesale)' },
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City" />
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">Financial Settings</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Currency"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            options={[
              { value: 'USD', label: '🇺🇸 USD — US Dollar' },
              { value: 'EUR', label: '🇪🇺 EUR — Euro' },
              { value: 'GBP', label: '🇬🇧 GBP — British Pound' },
              { value: 'KES', label: '🇰🇪 KES — Kenyan Shilling' },
              { value: 'NGN', label: '🇳🇬 NGN — Nigerian Naira' },
              { value: 'GHS', label: '🇬🇭 GHS — Ghanaian Cedi' },
              { value: 'ZAR', label: '🇿🇦 ZAR — South African Rand' },
              { value: 'INR', label: '🇮🇳 INR — Indian Rupee' },
              { value: 'AED', label: '🇦🇪 AED — UAE Dirham' },
            ]}
          />
          <Input
            label="Tax Rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.tax_rate}
            onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
            placeholder="e.g. 16"
          />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        {saved && <p className="text-emerald-400 text-sm font-medium">✓ Settings saved successfully!</p>}
        <div className="ml-auto">
          <Button variant="primary" onClick={handleSave} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
