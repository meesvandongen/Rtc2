import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type DataTableLocalization } from '../src'
import { appearanceArgTypes, loadingArgTypes } from './controls'
import { makePeople, personColumns } from './fixtures'

const data = makePeople(30)

const meta: Meta = {
  title: 'DataTable/13 Localization',
  argTypes: { ...appearanceArgTypes, ...loadingArgTypes },
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every string is overridable; unspecified keys keep the English default.
 *
 * The nested records are merged key by key, so `datePresets` below names three
 * of the fourteen periods and the rest stay English rather than disappearing.
 */
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
  select: 'Selecteren',
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
  // Everything the filter surfaces render, including the pieces the data types
  // contribute: the yes/no of a boolean, the units of a rolling window, the
  // words that join two conditions on one column.
  filters: 'Filters',
  clearAllFilters: 'Alles wissen',
  changeFilterMode: 'Filtermodus wijzigen',
  addCondition: 'Voorwaarde toevoegen',
  removeCondition: 'Voorwaarde verwijderen',
  matchAll: 'Alles moet kloppen',
  matchAny: 'Eén mag kloppen',
  and: 'en',
  or: 'of',
  from: 'Van',
  to: 'Tot',
  min: 'Minimaal',
  max: 'Maximaal',
  amount: 'aantal',
  unit: 'eenheid',
  booleanTrue: 'Ja',
  booleanFalse: 'Nee',
  selectPeriod: 'Kies een periode',
  showAll: 'Alles tonen',
  groupedBy: 'Gegroepeerd op',
  thenBy: ', daarna op ',
  weekdays: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
  dateUnits: { day: 'dagen', week: 'weken', month: 'maanden' },
  datePresets: { today: 'Vandaag', yesterday: 'Gisteren', thisMonth: 'Deze maand' },
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
  args: {
    locale: 'dutch',
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  argTypes: {
    locale: {
      control: 'select',
      options: ['dutch', 'english'],
      mapping: { dutch, english: undefined },
      description: 'Story-only knob: which `localization` object is passed to the table.',
      table: { category: 'Localization' },
    },
  },
  render: ({ locale, ...args }) => (
    <DataTable
      columns={personColumns.slice(0, 6)}
      data={data}
      getRowId={(row) => row.id}
      localization={locale}
      enableRowSelection
      enableColumnActions
      enableColumnPinning
      // The columns the component generates are named from the localization
      // too — open the column menu to see "Selecteren" and "Acties" rather
      // than the internal ids.
      enableEditing
      editMode="modal"
      initialState={{ showGlobalFilter: true }}
      {...args}
    />
  ),
}

/** A right-to-left locale combined with `direction="rtl"`. */
export const ArabicRTL: Story = {
  args: {
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
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
      {...args}
    />
  ),
}

/**
 * Filter operator names are localizable too — per data type where they differ.
 *
 * A key may be a bare operator id, which every data type showing that operator
 * picks up, or `dataTypeId.operatorId`, which wins for that one type. `equals`
 * is the reason the scoped form exists: on a text column it is "Is gelijk aan",
 * and on the faceted `enum` columns below the same operator reads "Is".
 */
export const LocalizedFilterOperators: Story = {
  args: {
    isLoading: false,
    showProgressBars: false,
    isSaving: false,
    isLoadingError: false,
    errorMessage: '',
    skeletonRowCount: 5,
  },
  render: (args) => (
    <DataTable
      columns={personColumns}
      data={data}
      getRowId={(row) => row.id}
      enableFilterModes
      enableMultipleFilterConditions
      filterDisplayMode="panel"
      height={520}
      initialState={{ showFilterPanel: true }}
      localization={{
        ...dutch,
        filterOperators: {
          contains: 'Bevat',
          equals: 'Is gelijk aan',
          notEquals: 'Is niet gelijk aan',
          startsWith: 'Begint met',
          endsWith: 'Eindigt op',
          isEmpty: 'Is leeg',
          isNotEmpty: 'Is niet leeg',
          isAnyOf: 'Is een van',
          between: 'Tussen',
          greaterThan: 'Groter dan',
          lessThan: 'Kleiner dan',
          inRangeSlider: 'In bereik',
          booleanIs: 'Is',
          dateIs: 'Is op',
          dateBetween: 'Ligt tussen',
          dateInPeriod: 'Valt in periode',
          dateInLast: 'Valt in de laatste',
          // Scoped to one data type: "is" reads better than "is gelijk aan"
          // when the operand is picked from a list, and a timestamp happens
          // *at* a moment rather than *on* a day — so `date` keeps `dateIs`
          // above and only `datetime` is redirected here.
          'enum.equals': 'Is',
          'datetime.dateIs': 'Is op het moment',
        },
      }}
      {...args}
    />
  ),
}
