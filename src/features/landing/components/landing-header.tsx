"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

import { landingNavigation } from "../content";
import { useLandingNavigation } from "../hooks/use-landing-navigation";
import { LandingBrand } from "./landing-brand";

export function LandingHeader() {
  const navigation = useLandingNavigation();
  return (
    <header className="lp-header" onKeyDown={navigation.onKeyDown}>
      <div className="lp-container lp-header-inner">
        <a
          href="#inicio"
          aria-label="AtJud — início"
          onClick={navigation.close}
        >
          <LandingBrand />
        </a>
        <nav className="lp-desktop-nav" aria-label="Navegação principal">
          {landingNavigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="lp-header-actions">
          <Link href="/sign-in" prefetch={false} className="lp-login">
            Entrar
          </Link>
          <Link
            href="/sign-up"
            prefetch={false}
            className={buttonVariants({ size: "sm" })}
          >
            Começar agora{" "}
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lp-menu-toggle"
            aria-label={navigation.open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={navigation.open}
            aria-controls="landing-mobile-nav"
            onClick={navigation.toggle}
          >
            {navigation.open ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      <nav
        id="landing-mobile-nav"
        className="lp-mobile-nav"
        aria-label="Navegação móvel"
        hidden={!navigation.open}
      >
        {landingNavigation.map((item) => (
          <a key={item.href} href={item.href} onClick={navigation.close}>
            {item.label}
            <ArrowUpRight aria-hidden="true" />
          </a>
        ))}
        <Link href="/sign-in" prefetch={false} onClick={navigation.close}>
          Entrar na plataforma
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
