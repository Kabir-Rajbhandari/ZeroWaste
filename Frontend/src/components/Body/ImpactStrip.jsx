import { useEffect, useState } from "react";
import { colors } from "../../theme";
import { analyticsApi } from "../../services/api";
import { useCountUp, formatNumber } from "../../utils/useCountUp";

export default function ImpactStrip() {
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Public, sitewide numbers aggregated across every user in the
        // database — the same source Hero.jsx uses, so both places on the
        // homepage always agree with each other and with the DB.
        const impactData = await analyticsApi.getCommunityImpact();
        if (!cancelled) {
          setImpact(impactData);
        }
      } catch {
        if (!cancelled) {
          setImpact({
            foodSavedCount: 0,
            activeHouseholds: 0,
            mealsSharedCount: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Animate the numbers
  const foodSavedCount = useCountUp(
    impact?.foodSavedCount ?? 0,
    2000,
    !!impact,
  );
  const activeHouseholdsCount = useCountUp(
    impact?.activeHouseholds ?? 0,
    2000,
    !!impact,
  );
  const mealsSharedCount = useCountUp(
    impact?.mealsSharedCount ?? 0,
    2000,
    !!impact,
  );

  const stats = [
    {
      num: `${formatNumber(foodSavedCount)}+`,
      label: "food saved from waste in our community",
    },
    {
      num: `${formatNumber(activeHouseholdsCount)}+`,
      label: "households actively reducing food waste",
    },
    {
      num: `${formatNumber(mealsSharedCount)}+`,
      label: "meals planned using ZeroWaste inventory",
    },
  ];
  return (
    <section className="py-5 impact-strip-section">
      <style>
        {`

          .impact-strip-section{
            min-height: 425px;
            align-content:center;
            position:relative;
            padding: 5rem 0;
            overflow:hidden;
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);

          }

          @media (max-width: 767px) {
            .impact-strip-section {
              padding: 3rem 0;
            }
          }

          .impact-strip-section::before{
            content: "";
            position:absolute;
            inset:0;
            background-image: url(/images/background_grafitte.png);
            background-size:cover;
            background-position:center;
            background-repeat:no-repeat;
            opacity: 0.10;
            z-index:0;
            pointer-events: none;
          }

          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .impact-card {
            animation: slideInUp 0.6s ease-out backwards;
          }

          .impact-card:nth-child(1) {
            animation-delay: 0.1s;
          }

          .impact-card:nth-child(2) {
            animation-delay: 0.2s;
          }

          .impact-card:nth-child(3) {
            animation-delay: 0.3s;
          }

          .impact-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 24px rgba(62, 160, 102, 0.2) !important;
          }
        `}
      </style>
      <div className="container" style={{ maxWidth: "1180px" }}>
        <div className="row g-4">
          {stats.map((s) => (
            <div key={s.label} className="col-lg-4">
              <div
                className="text-center h-100 impact-card"
                style={{
                  cursor: "default",
                  background: colors.showcase_green,
                  borderRadius: 6,
                  padding: "2.5rem 1.5rem",
                  boxShadow: "0 0px 5px rgb(169, 169, 169)",
                  transition:
                    "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
                }}
              >
                <div
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    color: colors.greenD,
                    lineHeight: 1,
                    marginBottom: "0.75rem",
                  }}
                >
                  {s.num}
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    color: colors.charcoal,
                    lineHeight: 1.5,
                  }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
