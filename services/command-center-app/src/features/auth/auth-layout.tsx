interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className='bg-primary-foreground container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8'>
        <div className='mb-6 flex items-center justify-center'>
          <div className='flex items-center gap-3'>
            <span className='text-3xl'>🧬</span>
            <span className='text-2xl font-black tracking-tight text-white uppercase'>
              SYNAPSE
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
