import { useEffect, useState } from "react";
import { Recycle, Users, Calendar, Bold } from "lucide-react";
import heroImage from "/images/hero_image.png";
import { colors, btnPrimaryStyle } from "../../theme";
import { analyticsApi } from "../../services/api";

const formatCount = (value) =>
  new Intl.NumberFormat("en-US").format(value ?? 0);

const defaultStats = [
  { icon: Recycle, label: "Food Saved", value: "0+" },
  { icon: Users, label: "Active Donors", value: "0+" },
  { icon: Calendar, label: "Meals Planned", value: "0+" },
];

const headingStyle = {
  fontSize: "clamp(2.4rem, 4.8vw, 3.5rem)",
  fontWeight: Bold,
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
  color: colors.charcoal,
  marginBottom: "1.25rem",
};

export default function Hero() {
  const [stats, setStats] = useState(defaultStats);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Public, sitewide numbers aggregated across every user in the
        // database — this is the only source for the homepage stats, since
        // it's the one analytics endpoint that doesn't require login.
        const impact = await analyticsApi.getCommunityImpact();

        if (cancelled) return;

        setStats([
          {
            icon: Recycle,
            label: "Food Saved",
            value: `${formatCount(impact?.foodSavedCount ?? 0)}+`,
          },
          {
            icon: Users,
            label: "Active Donors",
            value: `${formatCount(impact?.activeHouseholds ?? 0)}+`,
          },
          {
            icon: Calendar,
            label: "Meals Planned",
            value: `${formatCount(impact?.mealsSharedCount ?? 0)}+`,
          },
        ]);
      } catch {
        if (!cancelled) setStats(defaultStats);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="position-relative overflow-hidden hero-section"
      style={{
        width: "100%",
      }}
    >
      <style>
        {`
          .hero-section::before{
            content: "";
            position: absolute;
            inset: 0;
            background: ${colors.authGreen};
            z-index: 0;
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
          }

          .btn-browse {
            opacity: 0.75;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .btn-browse:hover:not(:disabled) {
            opacity: 1 !important;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

            .btn-outline:hover:not(:disabled) {
            opacity: 1;
            bordercolor: transparent;
            background:${colors.greenLrgb};
            }

            .sw-label:hover:not(:disabled) {
              opacity: 1 !important; 
              border-top: 2px solid ${colors.green} !important;
            }
          
          `}
      </style>

      <div className="container" style={{ maxWidth: "1180px" }}>
        <div
          className="row align-items-stretch g-5"
          style={{ paddingTop: "2.2rem" }}
        >
          <div className="col-lg-6 d-flex flex-column justify-content-center">
            <h1 style={headingStyle}>
              Rescue <span style={{ color: colors.green }}>Food.</span>
              <br />
              Feed <span style={{ color: colors.green }}>Communities.</span>
              <br />
              Foster{" "}
              <span style={{ color: colors.green }}>Sustainability.</span>
            </h1>

            <p
              className="mb-4"
              style={{
                fontSize: "1.05rem",
                color: colors.muted,
                maxWidth: 500,
                lineHeight: 1.7,
              }}
            >
              ZeroWaste helps households track, share, and plan around their
              food, so nothing goes to waste.
            </p>

            <div className="d-flex align-items-center flex-wrap gap-3 mb-4 mb-lg-0">
              <a
                href="#login"
                className="btn btn-primary btn-browse"
                style={{
                  ...btnPrimaryStyle,
                  padding: "0.85rem 1.60rem",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: 6,
                }}
              >
                Browse Today's Plates
              </a>
              <a
                href="#how-it-works"
                className="btn btn-outline"
                style={{
                  opacity: 0.75,
                  border: `2px solid ${colors.green}`,
                  color: colors.charcoal,
                  padding: "0.85rem 1.60rem",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: 6,
                }}
              >
                See how it works
              </a>
            </div>

            <div
              className="hr-line"
              style={{
                borderTop: `2px solid ${colors.green}`,
                padding: "5rem 0",
                margin: "5.3rem 0",
              }}
            >
              <div className="d-flex flex-wrap gap-3">
                {stats.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="d-flex align-items-center gap-3 flex-grow-1 sw-label"
                    style={{
                      cursor: "default",
                      opacity: "0.70",
                      border: "2px solid transparent",
                      background: colors.showcase_green,
                      borderRadius: 6,
                      padding: "0.85rem 0.95rem",
                      minWidth: 140,
                      flex: "1 1 0",
                      boxShadow: "0 0px 5px rgb(169, 169, 169)",
                      transition: "all 0.01s ease-in-out",
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ color: colors.green }}
                    >
                      <Icon size={28} strokeWidth={2} />
                    </div>
                    <div>
                      <div
                        className="text-label"
                        style={{
                          fontSize: "0.78rem",
                          color: colors.muted,
                          marginBottom: 2,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          color: colors.charcoal,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-6 d-flex align-items-stretch main">
            <div
              className="overflow-hidden img-holder"
              style={{
                borderRadius: 12,
                width: "100%",
                maxWidth: 550,
                height: 600,
                boxShadow: "0 0px 15px rgb(131, 130, 130)",
              }}
            >
              <img
                src={heroImage}
                alt="Fresh healthy food including vegetables, fruits, and proteins"
                className="w-100 h-100 object-fit-cover"
                style={{ minHeight: 360 }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
