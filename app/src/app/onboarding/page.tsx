import OnboardingClient from './OnboardingClient'

interface Props {
  searchParams: Promise<{ new?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const params = await searchParams
  const isNew = params.new === '1'
  return <OnboardingClient isNew={isNew} />
}
