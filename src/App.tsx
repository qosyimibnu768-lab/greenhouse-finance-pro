/**
 * Greenhouse Finance Pro
 * Aplikasi Manajemen Keuangan & Operasional Modern Perkebunan Melon Hidroponik DFT
 */

import React, { useState } from 'react';
import { GreenhouseProvider, useGreenhouse } from './context/GreenhouseContext';
import { NavItemKey, Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastContainer } from './components/Toast';
import { TransactionModal } from './components/TransactionModal';
import { Transaction } from './types';

// Pages
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TransactionsPage } from './pages/Transactions';
import { HarvestCalendarPage } from './pages/HarvestCalendar';
import { CropCyclesPage } from './pages/CropCycles';
import { HarvestSalesPage } from './pages/HarvestSales';
import { TunnelsPage } from './pages/Tunnels';
import { InvestmentsPage } from './pages/Investments';
import { InventoryPage } from './pages/Inventory';
import { AssetsPage } from './pages/Assets';
import { DebtsReceivablesPage } from './pages/DebtsReceivables';
import { ReportsPage } from './pages/Reports';
import { HRPayrollPage } from './pages/HRPayroll/HRPayroll';
import { ConstructionHRPage } from './pages/HRKonstruksi/ConstructionHR';
import { UsersPage } from './pages/UsersPage';
import { SettingsIntegrationsPage } from './pages/SettingsIntegrations';

const AppContent: React.FC = () => {
  const { currentUser } = useGreenhouse();
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [hrSubtab, setHrSubtab] = useState<string>('dashboard');

  // Transaction Modal State
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Authentication Gate
  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAddTransaction={() => {
              setEditingTransaction(null);
              setIsAddTransactionOpen(true);
            }}
          />
        );
      case 'transaksi':
        return (
          <TransactionsPage
            onOpenAddTransaction={() => {
              setEditingTransaction(null);
              setIsAddTransactionOpen(true);
            }}
            onEditTransaction={(trx) => {
              setEditingTransaction(trx);
              setIsAddTransactionOpen(true);
            }}
            onNavigate={(tab, sub) => {
              setCurrentTab(tab as NavItemKey);
              if (sub) setHrSubtab(sub);
            }}
          />
        );
      case 'kalender-panen':
        return <HarvestCalendarPage />;
      case 'siklus':
        return <CropCyclesPage />;
      case 'panen':
        return (
          <HarvestSalesPage
            onNavigate={(tab, sub) => {
              setCurrentTab(tab as NavItemKey);
              if (sub) setHrSubtab(sub);
            }}
          />
        );
      case 'investasi':
        return <InvestmentsPage />;
      case 'tunnels':
        return (
          <TunnelsPage
            onNavigateToCycles={() => setCurrentTab('siklus')}
            onNavigateToInvestments={() => setCurrentTab('investasi')}
          />
        );
      case 'stok':
        return <InventoryPage />;
      case 'aset':
        return <AssetsPage />;
      case 'hutang-piutang':
        return <DebtsReceivablesPage />;
      case 'laporan':
        return <ReportsPage />;
      case 'hr-payroll':
        return (
          <HRPayrollPage
            currentSubtab={hrSubtab}
            onSelectSubtab={(sub) => setHrSubtab(sub)}
          />
        );
      case 'hr-konstruksi':
        return <ConstructionHRPage />;
      case 'users':
        return <UsersPage />;
      case 'pengaturan':
        return <SettingsIntegrationsPage />;
      default:
        return (
          <Dashboard
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAddTransaction={() => {
              setEditingTransaction(null);
              setIsAddTransactionOpen(true);
            }}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Desktop Sidebar Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        hrSubtab={hrSubtab}
        onSelectHrSubtab={setHrSubtab}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenAddTransaction={() => {
            setEditingTransaction(null);
            setIsAddTransactionOpen(true);
          }}
          hrSubtab={hrSubtab}
          onSelectHrSubtab={setHrSubtab}
        />

        {/* Dynamic Page Body with Smooth Scroll */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Visible on mobile/tablet) */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAddTransaction={() => {
          setEditingTransaction(null);
          setIsAddTransactionOpen(true);
        }}
      />

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => {
          setIsAddTransactionOpen(false);
          setEditingTransaction(null);
        }}
        initialData={editingTransaction}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <GreenhouseProvider>
      <AppContent />
    </GreenhouseProvider>
  );
}
