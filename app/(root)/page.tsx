import HeaderBox from '@/components/HeaderBox'
import RigthSidebar from '@/components/RigthSidebar'
import TotalBalanceBox from '@/components/TotalBalanceBox'
import React from 'react'

const Hem = () => {
  const loggIn = { firstName: 'Marius', lastName: 'Christensen' ,email: 'info@marius-chritensen.se'}

  return (
    <section className='home'>
      <div className='home-content'>
        <header className='home-header'>
          <HeaderBox 
            type="greeting"
            title="Välkommen"
            user={loggIn?.firstName || 'Gäst'}
            subtext="Få tillgång till och hantera ditt konto och dina transaktioner effektivt"
          />

          <TotalBalanceBox 
          accounts={[]}
          totalBanks={1}
          totalCurrentBalance={12560.56}
          />
        </header>

        SENASTE TRANSAKTIONER
      </div>

      <RigthSidebar
        user={loggIn}
        transactions={[]}
        banks={[{ currentBalance: 123.50},{currentBalance:500.50}]}
      />
      </section>
  )
}

export default Hem