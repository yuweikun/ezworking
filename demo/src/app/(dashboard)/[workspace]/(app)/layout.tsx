import { SidebarLayout } from '#features/common/layouts/sidebar-layout'

export default (props: { children: React.ReactNode }) => {
  return <SidebarLayout>{props.children}</SidebarLayout>
}
