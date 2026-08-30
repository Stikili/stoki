import Link from 'next/link'
import type { BlogPostMeta } from '@/components/blog/BlogPostPage'

/**
 * First entry in the monthly SA cost report series.
 *
 * Figures are the ones Stoki itself ingests — SARB policy rate, prime and
 * CPI come from the SARB WebIndicators API (see lib/market-sources/sarb.ts),
 * fuel from the DMRE's monthly adjustment. Keep it that way: the series is
 * credible because the numbers are the same ones the advisor quotes, and it
 * stops being credible the moment a figure here is hand-waved.
 *
 * Cadence: DMRE adjusts fuel on the first Wednesday of each month, and that
 * is the trigger for the next edition.
 */

export const meta: BlogPostMeta = {
  slug: 'sa-small-business-cost-report-august-2026',
  title: 'SA small business cost report — August 2026',
  description:
    'Diesel is now more expensive than petrol in South Africa. What August 2026 fuel, repo rate and inflation figures mean for a small business’s margins.',
  published: '2026-08-30',
  excerpt:
    'Petrol got the headlines when it dropped 52c. Diesel quietly went up R1.38 — and for most small businesses, diesel is the number that matters.',
  tags: ['Cost report', 'Fuel', 'Interest rates'],
  readingMinutes: 4,
}

export default function Body() {
  return (
    <>
      <p>
        Every month the fuel price makes the news, the repo rate gets a headline for
        a day, and then everyone goes back to work. This is the version that matters
        if you run a business: what actually changed, and what it does to what you
        keep.
      </p>

      <h2>Where things stand</h2>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th className="num">Now</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SARB policy rate</td>
              <td className="num">7.00%</td>
              <td>Held, 23 July</td>
            </tr>
            <tr>
              <td>Prime lending rate</td>
              <td className="num">10.50%</td>
              <td>Unchanged</td>
            </tr>
            <tr>
              <td>Headline CPI (year-on-year)</td>
              <td className="num">5.0%</td>
              <td>Up, June figure</td>
            </tr>
            <tr>
              <td>Petrol 95 ULP, inland</td>
              <td className="num">R25.58/&#8467;</td>
              <td>Down 52c</td>
            </tr>
            <tr>
              <td>Diesel 500ppm wholesale, inland</td>
              <td className="num">R26.16/&#8467;</td>
              <td><strong>Up R1.38</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Fuel figures are the DMRE adjustment effective 5 August. Rates and inflation
        come from the South African Reserve Bank.
      </p>

      <h2>Diesel now costs more than petrol</h2>

      <p>
        That is the part worth stopping on. Inland diesel at R26.16 is running
        <strong> 58 cents above petrol 95</strong> at R25.58. For most of the last
        decade it was the other way around, and a lot of pricing assumptions were
        quietly built on the old order.
      </p>

      <p>
        The split happened because the two are priced on different things. Petrol
        came down partly because the DMRE cut the slate levy from R1.14 to 61 cents.
        Diesel did not get that relief and absorbed the underlying move instead.
      </p>

      <p>
        If you read &ldquo;petrol drops 52c&rdquo; and relaxed, and your business runs on a
        bakkie, a delivery vehicle or a generator, you got the opposite of the news
        you thought you got.
      </p>

      <h2>What it costs you</h2>

      <p>
        Round numbers, because the exact figure depends on your route and your
        vehicle. A one-tonne bakkie doing collections is usually somewhere near
        11&#8467;/100km.
      </p>

      <ul>
        <li>
          <strong>Two supplier runs a week, 40km round trip.</strong> That is roughly
          370km a month, about 41&#8467; of diesel. The R1.38 increase costs you about
          <strong> R56 a month</strong> — annoying, not structural.
        </li>
        <li>
          <strong>Daily deliveries, 60km a day, six days a week.</strong> Around
          1,560km a month, roughly 172&#8467;. That is about <strong>R237 a month</strong>
          {' '}more than July, for exactly the same work.
        </li>
        <li>
          <strong>A generator through load-shedding.</strong> A 5kVA unit burns
          roughly 1.5&#8467;/hour under load. Four hours a day for twenty days is
          120&#8467; — about <strong>R166 a month</strong> more than July.
        </li>
      </ul>

      <p>
        None of those numbers will close a business. The problem is that they arrive
        together, they are invisible unless you are tracking fuel as its own expense
        line, and they come out of margin you have already priced away.
      </p>

      <h2>What to actually do about it</h2>

      <p>
        The honest answer is that you cannot control the diesel price, so the
        question is only whether you notice it in time to reprice.
      </p>

      <ul>
        <li>
          <strong>Check whether delivery is priced or absorbed.</strong> If you quote
          free delivery above a certain basket size, that threshold was set against a
          different diesel price. It may now be below your cost.
        </li>
        <li>
          <strong>Consolidate runs before raising prices.</strong> Two collections a
          week instead of three is a bigger saving than any price increase you can
          push through without losing customers.
        </li>
        <li>
          <strong>Watch 2 September.</strong> That is the next DMRE adjustment, first
          Wednesday as always. If diesel moves again in the same direction, that is a
          trend rather than a month, and it justifies a real conversation about
          pricing.
        </li>
      </ul>

      <h2>On the rate side, nothing moved</h2>

      <p>
        The MPC held at 7.00% on 23 July, so prime stays at 10.50%. If you are
        carrying stock finance, an overdraft or vehicle finance, your repayment is
        the same this month as last.
      </p>

      <p>
        Inflation at 5.0% is the number to keep half an eye on. It sits inside the
        Reserve Bank&rsquo;s 3&ndash;6% target band but has been drifting up, and the
        MPC vote was not unanimous — two members wanted a hike. A business planning
        on rate cuts arriving soon is planning on something the Reserve Bank has not
        signalled.
      </p>

      <h2>The short version</h2>

      <p>
        Petrol fell and diesel rose, so if you move goods your costs went up in a
        month the headlines called relief. Borrowing costs are flat. Inflation is
        drifting toward the top half of the band.
      </p>

      <p>
        We publish this monthly, after the DMRE adjustment. The next one lands in
        early September. If you want these numbers applied to your own figures
        rather than to a generic bakkie,{' '}
        <Link href="/register">Stoki&rsquo;s advisor</Link> reads the same live SARB
        and fuel data against your actual expenses.
      </p>
    </>
  )
}
