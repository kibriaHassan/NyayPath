import { View } from 'react-native'
import { SelectField } from '../ui/SelectField'
import { useLocationOptions } from '../../hooks/useBdLocations'
import type { BdLocationFilterValues } from '../../data/locations'
import { useSettingsStore, useT } from '../../store/settingsStore'

type Props = {
  value: BdLocationFilterValues
  onChange: (next: BdLocationFilterValues) => void
  /**
   * search — বিভাগ/জেলা আবশ্যক, ধরন/আদালত ঐচ্ছিক
   * entry — চারটাই আবশ্যক (মামলা এন্ট্রি)
   */
  mode?: 'search' | 'entry'
}

export function BdLocationFilters({ value, onChange, mode = 'search' }: Props) {
  const t = useT()
  const { divisions, courtTypes, districtOptions, courtOptions } = useLocationOptions(value)
  const entry = mode === 'entry'

  const set = (patch: Partial<BdLocationFilterValues>) => onChange({ ...value, ...patch })

  return (
    <View style={{ gap: 10 }}>
      <SelectField
        label={t('division')}
        placeholder={t('selectDivision')}
        value={value.division}
        required={entry}
        options={divisions.map((d) => ({ value: d.name, label: d.name }))}
        onChange={(division) =>
          set({ division, district: '', courtType: '', court: '' })
        }
      />
      <SelectField
        label={t('district')}
        placeholder={value.division ? t('selectDistrict') : t('selectDivisionFirst')}
        value={value.district}
        required={entry}
        disabled={!value.division}
        options={districtOptions.map((d) => ({ value: d, label: d }))}
        onChange={(district) => set({ district, courtType: '', court: '' })}
      />
      <SelectField
        label={entry ? t('courtType') : `${t('courtType')} (${t('optional')})`}
        placeholder={value.district ? t('selectCourtType') : t('selectDistrictFirst')}
        value={value.courtType}
        required={entry}
        disabled={!value.district}
        options={courtTypes.map((ct) => ({ value: ct.value, label: ct.label }))}
        onChange={(courtType) => set({ courtType, court: '' })}
      />
      <SelectField
        label={entry ? t('court') : `${t('court')} (${t('optional')})`}
        placeholder={
          entry
            ? value.courtType
              ? t('selectCourt')
              : t('selectCourtTypeFirst')
            : value.district
              ? t('selectCourt')
              : t('selectDistrictFirst')
        }
        value={value.court}
        required={entry}
        disabled={entry ? !value.district || !value.courtType : !value.district}
        options={courtOptions.map((name) => ({ value: name, label: name }))}
        onChange={(court) => set({ court })}
      />
    </View>
  )
}
