import * as z from 'zod'
import {
  Card,
  CardBody,
  Flex,
  Heading,
  SystemProps,
  Text,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import {
  type DefaultValues,
  FieldValues,
  SubmitButton,
  SubmitHandler,
  UseFormReturn,
  WatchObserver,
} from '@saas-ui/react'

import { Form } from '#components/form'

export interface OnboardingStepProps<
  TFieldValues extends FieldValues = FieldValues,
> {
  title: string
  description: string
  schema: z.ZodObject<any, any, any>
  defaultValues: DefaultValues<TFieldValues>
  onChange?: WatchObserver<TFieldValues>
  onSubmit: SubmitHandler<TFieldValues>
  submitLabel: string
  maxW?: SystemProps['maxW']
  children: React.ReactNode
  formRef?: React.RefObject<UseFormReturn<TFieldValues>>
}

const fade = keyframes`
  0% {
    opacity: 0;
    transform: translate3d(0px, -10px, 0px);
  }
  100% {
    opacity: 1;
    transform: none;
  }
`

const animation = (delay = 0) =>
  `.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s 1 normal both running ${fade}`

export const OnboardingStep = <TFieldValues extends FieldValues = FieldValues>(
  props: OnboardingStepProps<TFieldValues>,
) => {
  const {
    title,
    description,
    schema,
    defaultValues,
    onChange,
    onSubmit,
    submitLabel,
    formRef,
    maxW = { base: '100%', md: '80%' },
    children,
  } = props
  return (
    <Flex flexDirection="column" alignItems="center" textAlign="center" mb="20">
      <Heading animation={animation(0)} size="lg" mb="6">
        {title}
      </Heading>
      <Text color="muted" fontSize="lg" animation={animation(0.1)} mb="8">
        {description}
      </Text>

      <Form
        schema={schema}
        formRef={formRef}
        defaultValues={defaultValues}
        mode="onTouched"
        onSubmit={onSubmit}
        onChange={onChange}
        alignSelf="stretch"
      >
        <Card
          mb="6"
          animation={animation(0.2)}
          zIndex="2"
          mx="auto"
          maxW={maxW}
        >
          <CardBody p="6">{children}</CardBody>
        </Card>

        <SubmitButton
          size="md"
          width="80%"
          maxW="320px"
          margin="0 10%"
          animation={animation(0.3)}
        >
          {submitLabel}
        </SubmitButton>
      </Form>
    </Flex>
  )
}
