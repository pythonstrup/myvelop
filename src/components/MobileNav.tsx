import { ExternalLink, Languages, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { externalLinks, isActivePath, navLinks } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
	currentPath: string;
	isKo: boolean;
	langSwitchHref: string;
};

export default function MobileNav({ currentPath, isKo, langSwitchHref }: Props) {
	const links = navLinks(isKo);
	const menuLabel = isKo ? "메뉴 열기" : "Open menu";
	const title = isKo ? "메뉴" : "Menu";
	const description = isKo ? "페이지와 외부 링크로 이동합니다." : "Navigate pages and external links.";

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon-lg" aria-label={menuLabel}>
					<Menu className="size-6" aria-hidden="true" />
				</Button>
			</SheetTrigger>
			<SheetContent
				className="w-[min(20rem,calc(100vw-2rem))]"
				closeLabel={isKo ? "닫기" : "Close"}
			>
				<SheetHeader className="border-b pr-14">
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>

				<nav aria-label={isKo ? "모바일 메뉴" : "Mobile navigation"} className="flex flex-col gap-1 px-3">
					{links.map((link) => (
						<SheetClose asChild key={link.href}>
							<a
								href={link.href}
								aria-current={isActivePath(currentPath, link.href) ? "page" : undefined}
								className={cn(
									"flex min-h-12 items-center rounded-lg px-4 text-base font-medium text-foreground no-underline transition-colors hover:bg-secondary",
									isActivePath(currentPath, link.href) && "bg-secondary text-primary",
								)}
							>
								{link.label}
							</a>
						</SheetClose>
					))}
				</nav>

				<SheetFooter className="border-t">
					<SheetClose asChild>
						<a
							href={langSwitchHref}
							className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground no-underline hover:bg-secondary"
						>
							<Languages className="size-5" aria-hidden="true" />
							{isKo ? "English" : "한국어"}
						</a>
					</SheetClose>
					{externalLinks.map(({ label, href }) => (
						<a
							key={label}
							href={href}
							target="_blank"
							rel="noreferrer"
							className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground no-underline hover:bg-secondary"
						>
							<ExternalLink className="size-5" aria-hidden="true" />
							{label}
						</a>
					))}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
