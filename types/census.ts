export interface LocationData {
  name: string
  state: string
  stateCode?: string
  placeId?: string
  population: number
  percentage: number
  zipCode: string
  // Nuevos campos demográficos
  ageGroups?: AgeDistribution
  incomeGroups?: IncomeDistribution
  educationLevels?: EducationDistribution
}

export interface AgeDistribution {
  under18: number
  age18to24: number
  age25to34: number
  age35to44: number
  age45to54: number
  age55to64: number
  age65plus: number
}

export interface IncomeDistribution {
  under25k: number
  income25kto50k: number
  income50kto75k: number
  income75kto100k: number
  income100kplus: number
}

export interface EducationDistribution {
  lessHighSchool: number
  highSchool: number
  someCollege: number
  bachelors: number
  graduate: number
}

export interface FilterOptions {
  ageRange: string[]
  incomeRange: string[]
  educationLevel: string[]
}

export const defaultFilterOptions: FilterOptions = {
  ageRange: ["all"],
  incomeRange: ["all"],
  educationLevel: ["all"],
}
