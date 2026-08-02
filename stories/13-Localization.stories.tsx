import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type DataTableLocalization } from '../src'
import { makePeople, personColumns } from './fixtures'

const data = makePeople(30)

const meta: Meta = {
  title: 'DataTable/13 Localization',
}

export default meta
type Story = StoryObj<typeof meta>

/** Every string is overridable; unspecified keys keep the English default. */
const dutch: Partial<DataTableLocalization> = {
  actions: 'Acties',
  cancel: 'Annuleren',
  clearFilter: 'Filter wissen',
  clearSearch: 'Zoekopdracht wissen',
  clearSort: 'Sortering wissen',
  columnActions: 'Kolomacties',
  edit: 'Bewerken',
  filterByColumn: 'Filter op {column}',
  goToFirstPage: 'Naar eerste pagina',
  goToLastPage: 'Naar laatste pagina',
  goToNextPage: 'Naar volgende pagina',
  goToPreviousPage: 'Naar vorige pagina',
  hideAll: 'Alles verbergen',
  hideColumn: 'Kolom {column} verbergen',
  noRecordsToDisplay: 'Geen gegevens om weer te geven',
  noResultsFound: 'Geen resultaten gevonden',
  of: 'van',
  pinToStart: 'Vastzetten aan begin',
  pinToEnd: 'Vastzetten aan eind',
  rowsPerPage: 'Rijen per pagina',
  save: 'Opslaan',
  search: 'Zoeken',
  selectedCountOfRowCountRowsSelected: '{selectedCount} van {rowCount} rij(en) geselecteerd',
  showAllColumns: 'Alle kolommen tonen',
  showHideColumns: 'Kolommen tonen/verbergen',
  showHideFilters: 'Filters tonen/verbergen',
  showHideSearch: 'Zoeken tonen/verbergen',
  sortByColumnAsc: 'Sorteer {column} oplopend',
  sortByColumnDesc: 'Sorteer {column} aflopend',
  toggleDensity: 'Dichtheid wisselen',
  toggleFullScreen: 'Volledig scherm wisselen',
  toggleSelectAll: 'Alles selecteren',
  toggleSelectRow: 'Rij selecteren',
  unpin: 'Losmaken',
}

const arabic: Partial<DataTableLocalization> = {
  actions: 'إجراءات',
  columnActions: 'إجراءات العمود',
  goToNextPage: 'الصفحة التالية',
  goToPreviousPage: 'الصفحة السابقة',
  goToFirstPage: 'الصفحة الأولى',
  goToLastPage: 'الصفحة الأخيرة',
  noRecordsToDisplay: 'لا توجد سجلات للعرض',
  of: 'من',
  rowsPerPage: 'صفوف لكل صفحة',
  search: 'بحث',
  showHideColumns: 'إظهار/إخفاء الأعمدة',
  showHideFilters: 'إظهار/إخفاء عوامل التصفية',
  toggleSelectAll: 'تحديد الكل',
  toggleSelectRow: 'تحديد الصف',
}

export const Dutch: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      localization={dutch}
      enableRowSelection
      enableColumnActions
      enableColumnPinning
      initialState={{ showGlobalFilter: true }}
    />
  ),
}

/** A right-to-left locale combined with `direction="rtl"`. */
export const ArabicRTL: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      localization={arabic}
      direction="rtl"
      enableRowSelection
      enableColumnActions
      enableColumnPinning
      initialState={{ showGlobalFilter: true, columnPinning: { start: ['rtc-select'], end: [] } }}
    />
  ),
}

/** Filter operator names are localizable too. */
export const LocalizedFilterOperators: Story = {
  render: () => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      enableFilterModes
      filterDisplayMode="panel"
      height={520}
      initialState={{ showFilterPanel: true }}
      localization={{
        ...dutch,
        filterOperators: {
          includesString: 'Bevat',
          equalsString: 'Is gelijk aan',
          startsWith: 'Begint met',
          endsWith: 'Eindigt op',
          empty: 'Is leeg',
          notEmpty: 'Is niet leeg',
        },
      }}
    />
  ),
}
