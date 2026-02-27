import { Link } from "react-router-dom";
import { MapPin, Shield, BarChart3, Search, ArrowRight, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const features = [
  { icon: MapPin, title: "GPS-Enabled Reporting", desc: "Auto-detect your location or pin it on the map for precise complaint placement" },
  { icon: Shield, title: "Ward-Level Intelligence", desc: "Automatic ward detection ensures your complaint reaches the right authority" },
  { icon: BarChart3, title: "Real-time Tracking", desc: "Track your complaint status from submission to resolution with live updates" },
];

const Index = () => {
  const [trackingId, setTrackingId] = useState("");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground leading-none">SmartCity</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Complaint Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/track">
              <Button variant="ghost" size="sm">Track Complaint</Button>
            </Link>
            <Link to="/admin/login">
              <Button variant="outline" size="sm">Admin</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-hero py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 animate-fade-in">
            Smart City Governance
          </h2>
          <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-8 animate-fade-in">
            Report civic issues instantly. GIS-powered complaint routing ensures your voice reaches the right ward officer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
            <Link to="/submit">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8">
                Report a Complaint <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/track">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-primary-foreground/10">
                <Search className="mr-2 h-4 w-4" /> Track Status
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Track */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="card-elevated p-6 max-w-xl mx-auto">
          <h3 className="font-display font-semibold text-foreground mb-3">Quick Track Your Complaint</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Complaint ID (e.g., SC2026-000001)"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => trackingId && navigate(`/track?id=${trackingId}`)}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">How It Works</h3>
          <p className="text-muted-foreground">Three simple steps to report and resolve civic issues</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card-elevated p-6 text-center animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mx-auto mb-4">
                <f.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h4 className="font-display font-semibold text-foreground mb-2">{f.title}</h4>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground">SmartCity GIS Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> 1800-XXX-XXXX</span>
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> support@smartcity.gov</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
